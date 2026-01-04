interface BackdropProps {
  isVisible: boolean;
  onClick: () => void;
}

export function Backdrop({ isVisible, onClick }: BackdropProps) {
  if (!isVisible) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity duration-300"
      onClick={onClick}
      aria-hidden="true"
    />
  );
}
