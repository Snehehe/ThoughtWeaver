export function Button({ className = "", children, ...props }) {
  return (
    <button
      className={
        "inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium bg-purple-600 text-white hover:bg-purple-500 transition " +
        className
      }
      {...props}
    >
      {children}
    </button>
  );
}
