'use client';

import { useSession, signIn, signOut } from 'next-auth/react';

export default function Home() {
  const { data: session, status } = useSession();

  // 디버깅: 세션 상태 확인
  if (typeof window !== 'undefined') {
    console.log('Session status:', status);
    console.log('Session data:', session);
    console.log('User role:', session?.user?.role);
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      {/* Header */}
      <header className="absolute top-0 left-0 right-0 p-4">
        <div className="flex items-center justify-between">
          <nav className="flex items-center space-x-6">
            <a
              href="/"
              className="text-lg font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              BearbrickDB
            </a>
            <a
              href="/bearbricks"
              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              베어브릭 목록
            </a>
            {session?.user && (
              <a
                href="/images/submit"
                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                이미지 등록
              </a>
            )}
            {/* Admin/Owner only menus */}
            {session?.user && (session.user.role === 'ADMIN' || session.user.role === 'OWNER') && (
              <>
                <a
                  href="/admin/submissions"
                  className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  이미지 승인 관리
                </a>
                <a
                  href="/admin/edit-requests"
                  className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  수정 요청 관리
                </a>
                <a
                  href="/admin/dashboard"
                  className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  관리자 대시보드
                </a>
              </>
            )}
            {/* Owner only menu */}
            {session?.user && session.user.role === 'OWNER' && (
              <a
                href="/admin/users"
                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                회원 관리
              </a>
            )}
          </nav>
          
          <div>
            {status === 'loading' ? (
              <div className="animate-pulse bg-gray-300 h-10 w-20 rounded"></div>
            ) : session ? (
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    안녕하세요, {session.user?.name}님
                  </div>
                  {session.user.role && (
                    <div className="text-xs text-gray-500 dark:text-gray-500">
                      {session.user.role === 'OWNER' && '🏆 오너'}
                      {session.user.role === 'ADMIN' && '👑 관리자'}
                      {session.user.role === 'USER' && '👤 사용자'}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => signOut()}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                >
                  로그아웃
                </button>
              </div>
            ) : (
              <button
                onClick={() => signIn()}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
              >
                로그인
              </button>
            )}
          </div>
        </div>
      </header>
      <main className="text-center space-y-8 max-w-2xl mx-auto">
        <h1 className="text-6xl font-bold text-blue-600 mb-4">
          Hello World! 🎉
        </h1>
        
        <h2 className="text-4xl font-semibold text-gray-800 dark:text-gray-200">
          BearbrickDB
        </h2>

        {/* Personalized greeting for logged-in users */}
        {session ? (
          <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
            <div className="flex items-center justify-center gap-2 mb-3">
              <span className="text-2xl">👋</span>
              <h3 className="text-2xl font-semibold text-blue-800 dark:text-blue-200">
                안녕하세요, {session.user?.name}님!
              </h3>
            </div>
            <p className="text-blue-700 dark:text-blue-300">
              BearbrickDB에 오신 것을 환영합니다. 오늘도 멋진 베어브릭을 만나보세요!
            </p>
          </div>
        ) : (
          <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
            <div className="flex items-center justify-center gap-2 mb-3">
              <span className="text-2xl">🎯</span>
              <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
                베어브릭 세계로의 여행을 시작하세요
              </h3>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              로그인하시면 개인화된 추천과 베어브릭 즐겨찾기 기능을 이용할 수 있습니다.
            </p>
            <button
              onClick={() => signIn()}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
            >
              지금 로그인하기
            </button>
          </div>
        )}
        
        <p className="text-xl text-gray-600 dark:text-gray-400">
          실제 환경 배포 테스트 성공! <br />
          Next.js 15 + Supabase + Vercel
        </p>
        
        <div className="bg-green-100 dark:bg-green-900 p-4 rounded-lg">
          <p className="text-green-800 dark:text-green-200 font-medium">
            ✅ GitHub 연동 완료 <br />
            ✅ Supabase 데이터베이스 연결 <br />
            ✅ Vercel 자동 배포 성공
          </p>
        </div>

        {/* Quick Actions */}
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-blue-100 dark:bg-blue-900 p-8 rounded-lg text-center">
              <h3 className="text-xl font-semibold text-blue-800 dark:text-blue-200 mb-4">
                🧸 베어브릭 탐색
              </h3>
              <p className="text-blue-700 dark:text-blue-300 mb-6">
                1,100개 이상의 베어브릭 컬렉션을 만나보세요. 시리즈별, 카테고리별로 필터링하고 검색할 수 있습니다.
              </p>

              <a
                href="/bearbricks"
                className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-8 rounded-lg transition-colors"
              >
                베어브릭 목록 보기
              </a>
            </div>

            {/* Image Upload Section */}
            {session ? (
              <div className="bg-green-100 dark:bg-green-900 p-8 rounded-lg text-center">
                <h3 className="text-xl font-semibold text-green-800 dark:text-green-200 mb-4">
                  📸 이미지 등록
                </h3>
                <p className="text-green-700 dark:text-green-300 mb-6">
                  베어브릭 이미지를 업로드하여 커뮤니티와 공유해보세요. 관리자 승인 후 공개됩니다.
                </p>

                <a
                  href="/images/submit"
                  className="inline-block bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-8 rounded-lg transition-colors"
                >
                  이미지 업로드
                </a>
              </div>
            ) : (
              <div className="bg-gray-100 dark:bg-gray-800 p-8 rounded-lg text-center">
                <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">
                  🔐 로그인 필요
                </h3>
                <p className="text-gray-700 dark:text-gray-300 mb-6">
                  이미지 업로드 및 개인화된 기능을 이용하려면 로그인이 필요합니다.
                </p>

                <button
                  onClick={() => signIn()}
                  className="inline-block bg-gray-600 hover:bg-gray-700 text-white font-medium py-3 px-8 rounded-lg transition-colors"
                >
                  로그인하기
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Current Login Status Debug */}
        {session && (
          <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 max-w-2xl mx-auto">
            <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-2">
              🔍 현재 로그인 상태 (디버깅 정보)
            </h4>
            <div className="text-xs text-yellow-700 dark:text-yellow-300 space-y-1">
              <p>상태: {status}</p>
              <p>사용자: {session.user?.name} ({session.user?.email})</p>
              <p>역할: {session.user?.role || '역할 정보 없음'}</p>
              <p>ID: {session.user?.id}</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
