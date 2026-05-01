export default function CalendarIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg 
      viewBox="0 0 20 20" 
      xmlns="http://www.w3.org/2000/svg" 
      className={className}
      fill="currentColor"
    >
      <path 
        d="M6 2C6 1.44772 6.44772 1 7 1C7.55228 1 8 1.44772 8 2V3H12V2C12 1.44772 12.4477 1 13 1C13.5523 1 14 1.44772 14 2V3H16C17.1046 3 18 3.89543 18 5V17C18 18.1046 17.1046 19 16 19H4C2.89543 19 2 18.1046 2 17V5C2 3.89543 2.89543 3 4 3H6V2ZM4 8V17H16V8H4ZM6 10H8V12H6V10ZM11 10H9V12H11V10ZM12 10H14V12H12V10ZM14 13H12V15H14V13ZM11 13H9V15H11V13ZM8 13H6V15H8V13Z" 
        fillRule="evenodd" 
        clipRule="evenodd"
      />
    </svg>
  );
}
