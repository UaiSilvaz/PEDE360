import Image from "next/image";
export default function BrandIcon({
  size = 44,
  light = false,
}: {
  size?: number;
  light?: boolean;
}) {
  return (
    <Image
      src={light ? "/brand/PEDE360%202.png" : "/brand/PEDE360.png"}
      alt="PEDE360"
      width={size}
      height={size}
      className="pede360-icon"
      priority
    />
  );
}
