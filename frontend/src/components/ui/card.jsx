export function Card({ className = "", children, ...props }) {
  return (
    <div
      className={
        "rounded-xl border border-purple-500/20 bg-black/40 shadow-lg " +
        className
      }
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className = "", children }) {
  return (
    <div className={"px-4 py-3 border-b border-purple-500/20 " + className}>
      {children}
    </div>
  );
}

export function CardTitle({ className = "", children }) {
  return <h2 className={"font-semibold " + className}>{children}</h2>;
}

export function CardContent({ className = "", children }) {
  return <div className={"px-4 py-3 " + className}>{children}</div>;
}
