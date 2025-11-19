export function Textarea({ className = "", ...props }) {
  return (
    <textarea
      className={
        "w-full rounded-md border border-purple-500/30 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-purple-400 " +
        className
      }
      {...props}
    />
  );
}
