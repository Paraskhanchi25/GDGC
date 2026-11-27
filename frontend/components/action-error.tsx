export function ActionError({ errors }: { errors: unknown[] }) {
  const error = errors.find(Boolean);
  return error ? (
    <p role="alert" className="feedback error">
      {error instanceof Error
        ? error.message
        : "We couldn't complete that action. Please try again."}
    </p>
  ) : null;
}
