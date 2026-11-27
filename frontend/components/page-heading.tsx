export function PageHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <header className="workspace-heading">
      <p className="eyebrow">{eyebrow}</p>
      <h1 className="mt-2 font-serif-display">{title}</h1>
      <p className="mt-3 max-w-2xl text-base leading-relaxed text-[var(--brown-grey)]">
        {description}
      </p>
    </header>
  );
}
