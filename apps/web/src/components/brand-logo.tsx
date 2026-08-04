import Image, { type ImageProps } from "next/image";
import { cn } from "@/lib/utils";

type BrandLogoProps = Omit<ImageProps, "src" | "alt" | "width" | "height"> & {
  alt?: string;
  size?: number;
};

export function BrandLogo({
  alt = "Clippy logo",
  className,
  size = 40,
  sizes,
  ...props
}: BrandLogoProps) {
  return (
    <Image
      src="/brand/clippy-logo.png"
      alt={alt}
      width={size}
      height={size}
      sizes={sizes ?? `${size}px`}
      className={cn("shrink-0 object-contain", className)}
      {...props}
    />
  );
}
