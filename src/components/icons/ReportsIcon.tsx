export default function ReportsIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg 
      viewBox="0 0 24 24" 
      xmlns="http://www.w3.org/2000/svg" 
      className={className}
      fill="currentColor"
    >
      <path 
        d="M3 3L21 3C21.2652 3 21.5196 3.10536 21.7071 3.29289C21.8946 3.48043 22 3.73478 22 4L22 20C22 20.2652 21.8946 20.5196 21.7071 20.7071C21.5196 20.8946 21.2652 21 21 21L3 21C2.73478 21 2.48043 20.8946 2.29289 20.7071C2.10536 20.5196 2 20.2652 2 20L2 4C2 3.73478 2.10536 3.48043 2.29289 3.29289C2.48043 3.10536 2.73478 3 3 3L3 3ZM4 5L4 19L20 19L20 5L4 5ZM7 13L9 13L9 17L7 17L7 13ZM11 7L13 7L13 17L11 17L11 7ZM15 10L17 10L17 17L15 17L15 10Z" 
        fillRule="evenodd" 
      />
    </svg>
  );
}
