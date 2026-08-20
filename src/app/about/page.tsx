import Link from 'next/link'

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-900">
            ← 홈으로
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-16">
        <img src="/logo-gombrick.png" alt="GomBrick" className="h-12 w-auto mb-4" />
        <p className="text-gray-600 leading-relaxed">
          베어브릭 컬렉션을 시리즈와 카테고리별로 정리하고 관리하는 개인용 데이터베이스입니다.
        </p>

        <section className="mt-10">
          <h2 className="text-lg font-bold text-gray-900 mb-3">주요 기능</h2>
          <ul className="space-y-2 text-gray-600 leading-relaxed list-disc list-inside">
            <li>시리즈·카테고리별로 정리된 베어브릭 목록 열람</li>
            <li>제품별 상세 정보(출시일, 설명, 이미지) 확인</li>
            <li>로그인 후 잘못된 정보에 대한 수정 요청 제출</li>
            <li>관리자의 엑셀 일괄 등록/수정 지원</li>
          </ul>
        </section>

        <section className="mt-8">
          <h2 className="text-lg font-bold text-gray-900 mb-3">정보가 틀렸다면</h2>
          <p className="text-gray-600 leading-relaxed">
            누구나 로그인 후 제품 상세 페이지에서 정보 수정을 요청할 수 있어요. 요청은 관리자
            검토를 거쳐 반영됩니다.
          </p>
        </section>

        <section className="mt-8 pt-8 border-t border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 mb-3">문의</h2>
          <p className="text-gray-600 leading-relaxed">
            버그 제보, 제안, 기타 문의는{' '}
            <a href="mailto:my@favorite.kr" className="text-blue-600 hover:underline">
              my@favorite.kr
            </a>
            로 보내주세요.
          </p>
        </section>
      </main>
    </div>
  )
}
