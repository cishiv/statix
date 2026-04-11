type MobileHeaderProps = {
  title: string;
  onToggle: () => void;
};

export function MobileHeader({ title, onToggle }: MobileHeaderProps): preact.JSX.Element {
  return (
    <header class="mobile-header">
      <button
        class="hamburger"
        onClick={onToggle}
        aria-label="Toggle navigation"
        type="button"
      >
        <span class="hamburger-line" />
        <span class="hamburger-line" />
        <span class="hamburger-line" />
      </button>
      <span class="mobile-title">{title}</span>
    </header>
  );
}
