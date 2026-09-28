// Marks a link that leaves the site in a new tab: icon for the eye, text for screen readers (SHIG 31, 59).
export function ExternalMark() {
  return (
    <>
      <svg
        aria-hidden="true"
        viewBox="0 0 16 16"
        className="inline-block w-3.5 h-3.5 ml-1 -mt-0.5 align-middle opacity-60"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M9 3h4v4M13 3 7 9M11 9.5V13H3V5h3.5" />
      </svg>
      <span className="sr-only">（外部サイト・新しいタブで開きます）</span>
    </>
  );
}
