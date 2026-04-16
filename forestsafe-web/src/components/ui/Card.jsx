export default function Card({ className = '', children, as: Tag = 'div', ...rest }) {
  return (
    <Tag
      className={`bg-white rounded-lg border border-neutral-200 p-5 ${className}`}
      {...rest}
    >
      {children}
    </Tag>
  );
}
