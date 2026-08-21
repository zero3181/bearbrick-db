export default function LoadingSpinner({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div className="flex gap-1.5">
        <span className="w-3 h-3 rounded-md bg-blue-600 animate-brick-bounce [animation-delay:0ms]" />
        <span className="w-3 h-3 rounded-md bg-gray-900 dark:bg-gray-100 animate-brick-bounce [animation-delay:150ms]" />
        <span className="w-3 h-3 rounded-md bg-blue-600 animate-brick-bounce [animation-delay:300ms]" />
      </div>
      {label && <p className="text-sm text-gray-400 dark:text-gray-500">{label}</p>}
    </div>
  )
}
