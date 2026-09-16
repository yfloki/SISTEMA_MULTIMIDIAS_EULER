const GRADIENTS: Record<string, string> = {
  red: 'from-rose-500 to-orange-400',
  blue: 'from-sky-500 to-indigo-500',
  green: 'from-emerald-500 to-lime-400',
  gold: 'from-amber-400 to-yellow-600',
  purple: 'from-violet-500 to-fuchsia-500',
  teal: 'from-teal-400 to-cyan-500',
};

export const AVATAR_KEYS = Object.keys(GRADIENTS);

export function AvatarBadge({ avatar, name, size = 96 }:
  { avatar: string; name: string; size?: number }) {
  return (
    <div
      className={`grid place-items-center rounded-2xl bg-gradient-to-br font-display font-bold
        ${GRADIENTS[avatar] ?? GRADIENTS.purple}`}
      style={{ width: size, height: size, fontSize: size * 0.42 }}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}
