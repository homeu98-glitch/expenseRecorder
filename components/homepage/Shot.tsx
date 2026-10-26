import Image from "next/image";

type ShotProps = {
  src: string;
  alt: string;
  /** 視窗標題（唔顯示假網址，避免似設計稿） */
  label?: string;
  ratio?: string;
  caption?: string;
  note?: string;
  priority?: boolean;
  sizes?: string;
};

/** 桌面端截圖：視窗外框（實機圖） */
export function BrowserShot({
  src,
  alt,
  label = "收銀系統",
  ratio = "1080 / 660",
  caption,
  note,
  priority = false,
  sizes = "(max-width: 900px) 100vw, 640px",
}: ShotProps) {
  return (
    <div className="s-browser">
      <div className="s-browser-bar">
        <div className="s-browser-dots">
          <i />
          <i />
          <i />
        </div>
        <div className="s-browser-url">{label}</div>
      </div>
      <div className="s-shot s-shot--top" style={{ aspectRatio: ratio }}>
        <Image
          src={src}
          alt={alt}
          fill
          priority={priority}
          sizes={sizes}
          style={{ objectFit: "cover", objectPosition: "top center" }}
        />
      </div>
      {caption ? (
        <div className="s-shot-cap">
          <b>{caption}</b>
          {note ? <span>{note}</span> : null}
        </div>
      ) : null}
    </div>
  );
}

/** 手機截圖（可自訂寬度／比例，供卡片內使用） */
export function PhoneFrame({
  src,
  alt,
  width,
  ratio = "500 / 1080",
  priority = false,
  sizes = "(max-width: 720px) 45vw, 220px",
}: {
  src: string;
  alt: string;
  width?: number | string;
  ratio?: string;
  priority?: boolean;
  sizes?: string;
}) {
  return (
    <div className="s-phone" style={width ? { width } : undefined}>
      <div className="s-shot" style={{ aspectRatio: ratio }}>
        <Image
          src={src}
          alt={alt}
          fill
          priority={priority}
          sizes={sizes}
          style={{ objectFit: "cover", objectPosition: "top center" }}
        />
      </div>
    </div>
  );
}

/** 手機端截圖：手機外框（實機圖） */
export function PhoneShot({
  src,
  alt,
  caption,
  sub,
  priority = false,
  sizes = "(max-width: 720px) 45vw, 260px",
}: Omit<ShotProps, "label" | "ratio" | "note"> & { sub?: string }) {
  return (
    <figure>
      <div className="s-phone">
        <div className="s-shot">
          <Image
            src={src}
            alt={alt}
            fill
            priority={priority}
            sizes={sizes}
            style={{ objectFit: "cover", objectPosition: "top center" }}
          />
        </div>
      </div>
      {caption ? (
        <figcaption>
          <b>{caption}</b>
          {sub ? <span>{sub}</span> : null}
        </figcaption>
      ) : null}
    </figure>
  );
}
