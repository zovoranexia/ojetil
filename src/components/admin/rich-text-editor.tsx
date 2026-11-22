"use client";

import Image from "@tiptap/extension-image";
import TextAlign from "@tiptap/extension-text-align";
import { NodeSelection, TextSelection } from "@tiptap/pm/state";
import { Placeholder } from "@tiptap/extensions";
import { EditorContent, Node, useEditor, useEditorState, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Loader2,
  Minus,
  MonitorPlay,
  Quote,
  Redo2,
  Strikethrough,
  Underline,
  Undo2,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useMessageText } from "@/components/i18n/message-text";
import { isAllowedEmbedSrc, toVideoEmbedUrl } from "@/lib/content/video-embed";
import { cn } from "@/lib/utils";
import { MediaPicker } from "./media/media-picker";
import { uploadEditorialImage } from "./upload-image";

/**
 * Rich-text editor for article bodies (TipTap). Output is HTML limited to what
 * the server-side sanitiser accepts (src/lib/content/sanitize.ts): headings
 * H2/H3, bold/italic/underline/strike, alignment, lists, quotes, rules, links,
 * uploaded images and YouTube/Vimeo embeds. Pasted content is reduced to the
 * same schema by ProseMirror, and the server sanitises again on save.
 */

/** Block node for YouTube (nocookie) / Vimeo iframes. Only canonical embed URLs are accepted. */
const VideoEmbed = Node.create({
  name: "videoEmbed",
  group: "block",
  atom: true,
  draggable: true,
  addAttributes() {
    return { src: { default: null } };
  },
  parseHTML() {
    return [
      {
        tag: "iframe[src]",
        getAttrs: (el) => {
          const src = toVideoEmbedUrl((el as HTMLElement).getAttribute("src") ?? "");
          return src ? { src } : false;
        },
      },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    const src = typeof HTMLAttributes.src === "string" && isAllowedEmbedSrc(HTMLAttributes.src) ? HTMLAttributes.src : "about:blank";
    return ["div", { "data-video-embed": "" }, ["iframe", { src, title: "Video", allowfullscreen: "true", loading: "lazy" }]];
  },
});

/**
 * Images carry an optional alignment (`data-align` = left | center | right).
 * Left/right float the image beside the text on wider screens; none = full width.
 * Set by the regular align buttons while an image is selected.
 */
export const IMAGE_ALIGNMENTS = ["left", "center", "right"] as const;
type ImageAlign = (typeof IMAGE_ALIGNMENTS)[number];

const AlignableImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      align: {
        default: null,
        parseHTML: (el) => {
          const v = el.getAttribute("data-align");
          return (IMAGE_ALIGNMENTS as readonly string[]).includes(v ?? "") ? v : null;
        },
        renderHTML: (attrs) => (attrs.align ? { "data-align": attrs.align } : {}),
      },
    };
  },
});

type PromptState =
  | { kind: "link"; value: string }
  | { kind: "video"; value: string }
  | { kind: "alt"; value: string; src: string }
  | null;

function ToolbarButton({ label, icon: Icon, active, disabled, onClick }: { label: string; icon: LucideIcon; active?: boolean; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active ?? undefined}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()} // keep the editor selection
      onClick={onClick}
      className={cn(
        "inline-flex size-9 shrink-0 items-center justify-center rounded-control text-ink-secondary transition-colors md:size-8",
        "hover:bg-surface-muted hover:text-ink disabled:pointer-events-none disabled:opacity-40",
        active && "bg-surface-muted text-ink",
      )}
    >
      <Icon aria-hidden="true" className="size-[1.125rem]" />
    </button>
  );
}

/** A run of related buttons; its left border is the divider (clipped when it starts a row). */
const Group = ({ children }: { children: ReactNode }) => (
  <div role="group" className="flex shrink-0 items-center gap-0.5 border-l border-border-subtle px-1">
    {children}
  </div>
);

function Toolbar({
  editor,
  onImage,
  onVideo,
  uploading,
  onPrompt,
}: {
  editor: Editor;
  onImage: () => void;
  onVideo: () => void;
  uploading: boolean;
  onPrompt: (p: PromptState) => void;
}) {
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      h2: e.isActive("heading", { level: 2 }),
      h3: e.isActive("heading", { level: 3 }),
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      underline: e.isActive("underline"),
      strike: e.isActive("strike"),
      // With an image selected, the align buttons show and set the image's alignment.
      image: e.state.selection instanceof NodeSelection && e.state.selection.node.type.name === "image",
      imageAlign: (e.state.selection instanceof NodeSelection && e.state.selection.node.type.name === "image"
        ? (e.state.selection.node.attrs.align as ImageAlign | null)
        : null),
      left: e.isActive({ textAlign: "left" }),
      center: e.isActive({ textAlign: "center" }),
      right: e.isActive({ textAlign: "right" }),
      justify: e.isActive({ textAlign: "justify" }),
      bullet: e.isActive("bulletList"),
      ordered: e.isActive("orderedList"),
      quote: e.isActive("blockquote"),
      link: e.isActive("link"),
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
      editable: e.isEditable,
    }),
  });
  const t = useTranslations("admin.richText.toolbar");
  const c = () => editor.chain().focus();
  const off = !s.editable;
  /** Aligns the selected image (clicking the active alignment again resets it to full width), or the text block. */
  const align = (a: "left" | "center" | "right" | "justify") => {
    if (s.image) {
      if (a === "justify") return;
      // Keep the image selected so the user can try another alignment straight away.
      c().updateAttributes("image", { align: s.imageAlign === a ? null : a }).setNodeSelection(editor.state.selection.from).run();
      return;
    }
    c().setTextAlign(a).run();
  };
  const alignActive = (a: "left" | "center" | "right" | "justify") => (s.image ? s.imageAlign === a : s[a]);

  /*
   * Buttons are grouped; each group draws its own left divider. The row sits
   * 1px left of a clipping wrapper, so whichever group starts a line (first
   * line or after wrapping) has its divider clipped: no divider ever dangles at
   * the start of a row, and a group never splits across rows.
   */
  return (
    <div role="toolbar" aria-label={t("label")} className="border-b border-border-subtle bg-paper/60 px-2 py-1.5">
      {/* overflow clips at the padding edge, so the clipping box itself has no padding */}
      <div className="overflow-hidden">
        <div className="-ml-px flex flex-wrap items-center gap-y-1">
        <Group>
          <ToolbarButton label={t("heading2")} icon={Heading2} active={s.h2} disabled={off} onClick={() => c().toggleHeading({ level: 2 }).run()} />
          <ToolbarButton label={t("heading3")} icon={Heading3} active={s.h3} disabled={off} onClick={() => c().toggleHeading({ level: 3 }).run()} />
        </Group>
        <Group>
          <ToolbarButton label={t("bold")} icon={Bold} active={s.bold} disabled={off} onClick={() => c().toggleBold().run()} />
          <ToolbarButton label={t("italic")} icon={Italic} active={s.italic} disabled={off} onClick={() => c().toggleItalic().run()} />
          <ToolbarButton label={t("underline")} icon={Underline} active={s.underline} disabled={off} onClick={() => c().toggleUnderline().run()} />
          <ToolbarButton label={t("strike")} icon={Strikethrough} active={s.strike} disabled={off} onClick={() => c().toggleStrike().run()} />
        </Group>
        <Group>
          <ToolbarButton label={t("alignLeft")} icon={AlignLeft} active={alignActive("left")} disabled={off} onClick={() => align("left")} />
          <ToolbarButton label={t("alignCenter")} icon={AlignCenter} active={alignActive("center")} disabled={off} onClick={() => align("center")} />
          <ToolbarButton label={t("alignRight")} icon={AlignRight} active={alignActive("right")} disabled={off} onClick={() => align("right")} />
          <ToolbarButton label={t("justify")} icon={AlignJustify} active={alignActive("justify")} disabled={off || s.image} onClick={() => align("justify")} />
        </Group>
        <Group>
          <ToolbarButton label={t("bulletList")} icon={List} active={s.bullet} disabled={off} onClick={() => c().toggleBulletList().run()} />
          <ToolbarButton label={t("orderedList")} icon={ListOrdered} active={s.ordered} disabled={off} onClick={() => c().toggleOrderedList().run()} />
          <ToolbarButton label={t("quote")} icon={Quote} active={s.quote} disabled={off} onClick={() => c().toggleBlockquote().run()} />
        </Group>
        <Group>
          <ToolbarButton label={t("horizontalRule")} icon={Minus} disabled={off} onClick={() => c().setHorizontalRule().run()} />
          <ToolbarButton
            label={t("link")}
            icon={Link2}
            active={s.link}
            disabled={off}
            onClick={() => onPrompt({ kind: "link", value: (editor.getAttributes("link").href as string | undefined) ?? "https://" })}
          />
          <ToolbarButton label={uploading ? t("uploadingImage") : t("insertImage")} icon={uploading ? Loader2 : ImagePlus} disabled={off || uploading} onClick={onImage} />
          <ToolbarButton label={t("embedVideo")} icon={MonitorPlay} disabled={off} onClick={onVideo} />
        </Group>
        <Group>
          <ToolbarButton label={t("undo")} icon={Undo2} disabled={off || !s.canUndo} onClick={() => c().undo().run()} />
          <ToolbarButton label={t("redo")} icon={Redo2} disabled={off || !s.canRedo} onClick={() => c().redo().run()} />
        </Group>
        </div>
      </div>
    </div>
  );
}

export function RichTextEditor({
  id,
  value,
  onChange,
  disabled,
  invalid,
  describedBy,
  labelledBy,
  placeholder,
  maxImageBytes,
  maxMediaBytes,
  lang,
  fill = false,
}: {
  id: string;
  value: string;
  onChange: (html: string) => void;
  disabled?: boolean;
  invalid?: boolean;
  describedBy?: string;
  labelledBy: string;
  placeholder?: string;
  maxImageBytes: number;
  /** Media library limit for PDF/MP4/MP3 (shown in the picker's upload zone). */
  maxMediaBytes: number;
  lang?: string;
  /** Stretch to the parent's height (parent must be a flex column); still grows with long content. */
  fill?: boolean;
}) {
  const t = useTranslations("admin.richText");
  const tCommon = useTranslations("admin.common");
  const text = useMessageText();
  const [prompt, setPrompt] = useState<PromptState>(null);
  const [promptError, setPromptError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  /** Media library picker for images or videos (toolbar buttons). */
  const [picker, setPicker] = useState<"image" | "video" | null>(null);
  const tMedia = useTranslations("admin.media");
  const promptRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    immediatelyRender: false,
    editable: !disabled,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        code: false,
        codeBlock: false,
        link: {
          openOnClick: false,
          autolink: true,
          defaultProtocol: "https",
          protocols: ["http", "https", "mailto"],
          isAllowedUri: (url, ctx) => /^(https?:|mailto:)/i.test(url) && ctx.defaultValidate(url),
          HTMLAttributes: { rel: "noopener noreferrer nofollow", target: "_blank" },
        },
      }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Placeholder.configure({ placeholder: placeholder ?? t("placeholder") }),
      AlignableImage.configure({ inline: false, allowBase64: false }),
      VideoEmbed,
    ],
    content: value,
    editorProps: {
      attributes: {
        id,
        role: "textbox",
        "aria-multiline": "true",
        "aria-labelledby": labelledBy,
        ...(describedBy ? { "aria-describedby": describedBy } : {}),
        ...(invalid ? { "aria-invalid": "true" } : {}),
        ...(lang ? { lang } : {}),
        class: "rich-content rich-editor min-h-72 flex-1 px-4 py-3 outline-none",
      },
      // Images pasted/dropped as files would otherwise become base64 blobs; route them through the uploader instead.
      handlePaste: (_view, event) => {
        const file = Array.from(event.clipboardData?.files ?? []).find((f) => f.type.startsWith("image/"));
        if (!file) return false;
        void upload(file);
        return true;
      },
      handleDrop: (_view, event) => {
        const file = Array.from((event as DragEvent).dataTransfer?.files ?? []).find((f) => f.type.startsWith("image/"));
        if (!file) return false;
        void upload(file);
        return true;
      },
    },
    onUpdate: ({ editor: e }) => onChange(e.isEmpty ? "" : e.getHTML()),
  });

  useEffect(() => {
    editor?.setEditable(!disabled);
  }, [editor, disabled]);

  useEffect(() => {
    if (!editor) return;
    editor.setOptions({
      editorProps: {
        ...editor.options.editorProps,
        attributes: {
          ...(editor.options.editorProps.attributes as Record<string, string>),
          "aria-invalid": invalid ? "true" : "false",
        },
      },
    });
  }, [editor, invalid]);

  useEffect(() => {
    if (prompt) requestAnimationFrame(() => promptRef.current?.focus());
  }, [prompt]);

  async function upload(file: File) {
    setUploading(true);
    setPromptError(null);
    const r = await uploadEditorialImage(file, maxImageBytes);
    setUploading(false);
    if (!r.ok) {
      setPrompt(null);
      setPromptError(text(r.message));
      return;
    }
    setPrompt({ kind: "alt", value: "", src: r.url });
  }

  /**
   * Inserts an image/video block followed by an empty paragraph holding the
   * caret. Without it the new atom stays node-selected (the next insertion
   * would replace it) or the caret jumps into the following block (e.g. a list).
   */
  function insertBlock(content: { type: string; attrs: Record<string, string> }) {
    editor
      ?.chain()
      .focus()
      .insertContent([content, { type: "paragraph" }])
      .command(({ tr }) => {
        if (tr.selection instanceof NodeSelection) tr.setSelection(TextSelection.near(tr.doc.resolve(tr.selection.to)));
        return true;
      })
      .run();
  }

  function applyPrompt() {
    if (!editor || !prompt) return;
    const v = prompt.value.trim();
    if (prompt.kind === "link") {
      if (!v || v === "https://") editor.chain().focus().extendMarkRange("link").unsetLink().run();
      else if (!/^(https?:\/\/|mailto:)/i.test(v)) return setPromptError(t("errors.linkInvalid"));
      else editor.chain().focus().extendMarkRange("link").setLink({ href: v }).run();
    } else if (prompt.kind === "video") {
      const src = toVideoEmbedUrl(v);
      if (!src) return setPromptError(t("errors.videoInvalid"));
      insertBlock({ type: "videoEmbed", attrs: { src } });
    } else {
      insertBlock({ type: "image", attrs: { src: prompt.src, alt: v.slice(0, 200) } });
    }
    setPrompt(null);
    setPromptError(null);
  }

  function cancelPrompt() {
    // An uploaded image is still inserted, just without a description.
    if (prompt?.kind === "alt") insertBlock({ type: "image", attrs: { src: prompt.src, alt: "" } });
    setPrompt(null);
    setPromptError(null);
  }

  let promptBar: ReactNode = null;
  if (prompt) {
    promptBar = (
      <div className="flex flex-wrap items-center gap-2 border-b border-border-subtle bg-surface-muted/50 px-3 py-2">
        <label htmlFor={`${id}-prompt`} className="text-sm font-medium">
          {t(`prompt.${prompt.kind}`)}
        </label>
        <input
          id={`${id}-prompt`}
          ref={promptRef}
          value={prompt.value}
          onChange={(e) => setPrompt({ ...prompt, value: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              applyPrompt();
            } else if (e.key === "Escape") {
              e.preventDefault();
              cancelPrompt();
            }
          }}
          placeholder={prompt.kind === "video" ? "https://www.youtube.com/watch?v=…" : undefined}
          className="min-h-9 min-w-48 flex-1 rounded-control border border-border-subtle bg-surface-card px-2 text-sm"
        />
        <button type="button" onClick={applyPrompt} className="min-h-9 rounded-control bg-ink px-3 text-sm font-semibold text-paper">
          {prompt.kind === "alt" ? t("prompt.insert") : t("prompt.apply")}
        </button>
        {prompt.kind === "link" && editor?.isActive("link") ? (
          <button
            type="button"
            onClick={() => {
              editor.chain().focus().extendMarkRange("link").unsetLink().run();
              setPrompt(null);
            }}
            className="min-h-9 rounded-control px-3 text-sm font-semibold text-status-rejected"
          >
            {t("prompt.removeLink")}
          </button>
        ) : null}
        <button type="button" onClick={cancelPrompt} className="min-h-9 rounded-control px-3 text-sm font-semibold text-ink-secondary">
          {prompt.kind === "alt" ? t("prompt.skip") : tCommon("cancel")}
        </button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-control border bg-surface-card focus-within:border-ojetil-red",
        fill && "flex-1",
        invalid ? "border-status-rejected" : "border-border-subtle hover:border-border-strong",
        disabled && "opacity-70",
      )}
    >
      {editor ? (
        <Toolbar editor={editor} onImage={() => setPicker("image")} onVideo={() => setPicker("video")} uploading={uploading} onPrompt={setPrompt} />
      ) : (
        <div className="h-12 border-b border-border-subtle bg-paper/60" />
      )}
      {promptBar}
      {promptError ? (
        <p role="alert" className="border-b border-border-subtle bg-status-rejected-bg px-3 py-2 text-sm text-status-rejected">
          {promptError}
        </p>
      ) : null}
      {/* The ProseMirror element fills the frame, so a click anywhere in it places the caret. */}
      <EditorContent editor={editor} className="flex flex-1 flex-col" />
      <MediaPicker
        open={picker !== null}
        onOpenChange={(o) => (!o ? setPicker(null) : undefined)}
        kinds={picker === "video" ? ["VIDEO_LINK"] : ["IMAGE"]}
        title={picker === "video" ? tMedia("picker.titleVideos") : tMedia("picker.titleImages")}
        canUpload={!disabled}
        limits={{ imageMb: Math.round(maxImageBytes / 1_048_576), fileMb: Math.round(maxMediaBytes / 1_048_576) }}
        onSelect={(asset) => {
          // Images: confirm/adjust the description (prefilled from the library) before inserting.
          if (asset.kind === "IMAGE") setPrompt({ kind: "alt", value: asset.altText ?? "", src: asset.url });
          else if (asset.kind === "VIDEO_LINK") insertBlock({ type: "videoEmbed", attrs: { src: asset.url } });
        }}
      />
    </div>
  );
}
