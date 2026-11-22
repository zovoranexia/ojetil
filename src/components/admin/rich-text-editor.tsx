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
import { useEffect, useRef, useState, type ReactNode } from "react";
import { isAllowedEmbedSrc, toVideoEmbedUrl } from "@/lib/content/video-embed";
import { cn } from "@/lib/utils";
import { ACCEPTED_IMAGE_TYPES, uploadEditorialImage } from "./upload-image";

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
        "inline-flex size-9 shrink-0 items-center justify-center rounded-control text-ink-secondary transition-colors",
        "hover:bg-surface-muted hover:text-ink disabled:pointer-events-none disabled:opacity-40",
        active && "bg-surface-muted text-ink",
      )}
    >
      <Icon aria-hidden="true" className="size-[1.125rem]" />
    </button>
  );
}

const Sep = () => <span aria-hidden="true" className="mx-1 h-6 w-px shrink-0 bg-border-subtle" />;

function Toolbar({ editor, onImage, uploading, onPrompt }: { editor: Editor; onImage: () => void; uploading: boolean; onPrompt: (p: PromptState) => void }) {
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      h2: e.isActive("heading", { level: 2 }),
      h3: e.isActive("heading", { level: 3 }),
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      underline: e.isActive("underline"),
      strike: e.isActive("strike"),
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
  const c = () => editor.chain().focus();
  const off = !s.editable;

  return (
    <div role="toolbar" aria-label="Formatting" className="flex flex-wrap items-center gap-0.5 border-b border-border-subtle bg-paper/60 px-2 py-1.5">
      <ToolbarButton label="Heading 2" icon={Heading2} active={s.h2} disabled={off} onClick={() => c().toggleHeading({ level: 2 }).run()} />
      <ToolbarButton label="Heading 3" icon={Heading3} active={s.h3} disabled={off} onClick={() => c().toggleHeading({ level: 3 }).run()} />
      <Sep />
      <ToolbarButton label="Bold" icon={Bold} active={s.bold} disabled={off} onClick={() => c().toggleBold().run()} />
      <ToolbarButton label="Italic" icon={Italic} active={s.italic} disabled={off} onClick={() => c().toggleItalic().run()} />
      <ToolbarButton label="Underline" icon={Underline} active={s.underline} disabled={off} onClick={() => c().toggleUnderline().run()} />
      <ToolbarButton label="Strikethrough" icon={Strikethrough} active={s.strike} disabled={off} onClick={() => c().toggleStrike().run()} />
      <Sep />
      <ToolbarButton label="Align left" icon={AlignLeft} active={s.left} disabled={off} onClick={() => c().setTextAlign("left").run()} />
      <ToolbarButton label="Align centre" icon={AlignCenter} active={s.center} disabled={off} onClick={() => c().setTextAlign("center").run()} />
      <ToolbarButton label="Align right" icon={AlignRight} active={s.right} disabled={off} onClick={() => c().setTextAlign("right").run()} />
      <ToolbarButton label="Justify" icon={AlignJustify} active={s.justify} disabled={off} onClick={() => c().setTextAlign("justify").run()} />
      <Sep />
      <ToolbarButton label="Bulleted list" icon={List} active={s.bullet} disabled={off} onClick={() => c().toggleBulletList().run()} />
      <ToolbarButton label="Numbered list" icon={ListOrdered} active={s.ordered} disabled={off} onClick={() => c().toggleOrderedList().run()} />
      <ToolbarButton label="Quote" icon={Quote} active={s.quote} disabled={off} onClick={() => c().toggleBlockquote().run()} />
      <Sep />
      <ToolbarButton label="Horizontal line" icon={Minus} disabled={off} onClick={() => c().setHorizontalRule().run()} />
      <Sep />
      <ToolbarButton
        label="Link"
        icon={Link2}
        active={s.link}
        disabled={off}
        onClick={() => onPrompt({ kind: "link", value: (editor.getAttributes("link").href as string | undefined) ?? "https://" })}
      />
      <ToolbarButton label={uploading ? "Uploading image…" : "Insert image"} icon={uploading ? Loader2 : ImagePlus} disabled={off || uploading} onClick={onImage} />
      <ToolbarButton label="Embed video (YouTube or Vimeo)" icon={MonitorPlay} disabled={off} onClick={() => onPrompt({ kind: "video", value: "" })} />
      <Sep />
      <ToolbarButton label="Undo" icon={Undo2} disabled={off || !s.canUndo} onClick={() => c().undo().run()} />
      <ToolbarButton label="Redo" icon={Redo2} disabled={off || !s.canRedo} onClick={() => c().redo().run()} />
    </div>
  );
}

const PROMPT_LABEL = { link: "Link address", video: "YouTube or Vimeo URL", alt: "Describe the image (alt text)" } as const;

export function RichTextEditor({
  id,
  value,
  onChange,
  disabled,
  invalid,
  describedBy,
  labelledBy,
  placeholder = "Start writing…",
  maxImageBytes,
  lang,
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
  lang?: string;
}) {
  const [prompt, setPrompt] = useState<PromptState>(null);
  const [promptError, setPromptError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
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
      Placeholder.configure({ placeholder }),
      Image.configure({ inline: false, allowBase64: false }),
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
        class: "rich-content rich-editor min-h-72 px-4 py-3 outline-none",
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
      setPromptError(r.message);
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
      else if (!/^(https?:\/\/|mailto:)/i.test(v)) return setPromptError("Use a full address starting with https:// (or mailto:).");
      else editor.chain().focus().extendMarkRange("link").setLink({ href: v }).run();
    } else if (prompt.kind === "video") {
      const src = toVideoEmbedUrl(v);
      if (!src) return setPromptError("Only YouTube and Vimeo links can be embedded.");
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
          {PROMPT_LABEL[prompt.kind]}
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
          {prompt.kind === "alt" ? "Insert" : "Apply"}
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
            Remove link
          </button>
        ) : null}
        <button type="button" onClick={cancelPrompt} className="min-h-9 rounded-control px-3 text-sm font-semibold text-ink-secondary">
          {prompt.kind === "alt" ? "Skip" : "Cancel"}
        </button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-control border bg-surface-card focus-within:border-ojetil-red",
        invalid ? "border-status-rejected" : "border-border-subtle hover:border-border-strong",
        disabled && "opacity-70",
      )}
    >
      {editor ? <Toolbar editor={editor} onImage={() => fileRef.current?.click()} uploading={uploading} onPrompt={setPrompt} /> : <div className="h-12 border-b border-border-subtle bg-paper/60" />}
      {promptBar}
      {promptError ? (
        <p role="alert" className="border-b border-border-subtle bg-status-rejected-bg px-3 py-2 text-sm text-status-rejected">
          {promptError}
        </p>
      ) : null}
      <EditorContent editor={editor} />
      <input
        ref={fileRef}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES}
        className="hidden"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) void upload(f);
        }}
      />
    </div>
  );
}
