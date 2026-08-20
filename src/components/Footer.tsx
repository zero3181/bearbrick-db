export default function Footer() {
  return (
    <footer className="border-t border-gray-100 mt-16">
      <div className="max-w-7xl mx-auto px-4 py-6 text-center text-xs text-gray-400">
        <p>&copy; {new Date().getFullYear()} GomBrick. All rights reserved.</p>
        <p className="mt-1">
          문의:{' '}
          <a href="mailto:my@favorite.kr" className="hover:text-gray-600">
            my@favorite.kr
          </a>
        </p>
      </div>
    </footer>
  )
}
