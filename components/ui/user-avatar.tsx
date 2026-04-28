const PALETTE = [
  "bg-red-500","bg-orange-500","bg-amber-500","bg-yellow-500",
  "bg-lime-600","bg-emerald-500","bg-teal-500","bg-cyan-500",
  "bg-sky-500","bg-blue-500","bg-indigo-500","bg-violet-500",
  "bg-purple-500","bg-fuchsia-500","bg-pink-500","bg-rose-500",
];

function nameToColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) & 0xffffffff;
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

interface UserAvatarProps {
  name: string;
  emoji?: string | null;
  size?: "sm" | "md" | "lg";
}

const sizes = { sm: "h-7 w-7 text-xs", md: "h-9 w-9 text-sm", lg: "h-11 w-11 text-base" };

export function UserAvatar({ name, emoji, size = "md" }: UserAvatarProps) {
  if (emoji) {
    return (
      <div className={`${sizes[size]} rounded-full flex items-center justify-center bg-muted shrink-0`}>
        <span className="leading-none">{emoji}</span>
      </div>
    );
  }
  return (
    <div className={`${sizes[size]} rounded-full flex items-center justify-center ${nameToColor(name)} text-white font-semibold shrink-0`}>
      {initials(name)}
    </div>
  );
}
