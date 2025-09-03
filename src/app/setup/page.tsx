'use client';

import { useState } from 'react';

interface ApiResult {
  success: boolean;
  message?: string;
  error?: string;
  output?: string;
}

export default function SetupPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ApiResult | null>(null);

  const setupDatabase = async () => {
    setIsLoading(true);
    setResult(null);
    
    try {
      const response = await fetch('/api/setup-db', {
        method: 'POST',
      });
      
      const data = await response.json();
      setResult(data);
    } catch {
      setResult({ success: false, error: 'Failed to setup database' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold text-center mb-6">
          베어브릭 DB 설정
        </h1>
        
        <p className="text-gray-600 dark:text-gray-400 text-center mb-6">
          데이터베이스 테이블을 생성하려면 아래 버튼을 클릭하세요.
        </p>
        
        <button
          onClick={setupDatabase}
          disabled={isLoading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-3 px-4 rounded-lg transition-colors"
        >
          {isLoading ? '설정 중...' : '데이터베이스 설정하기'}
        </button>
        
        {result && (
          <div className={`mt-6 p-4 rounded-lg ${
            result.success 
              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
          }`}>
            <h3 className="font-medium mb-2">
              {result.success ? '✅ 성공!' : '❌ 실패'}
            </h3>
            <p className="text-sm">{result.message || result.error}</p>
            {result.output && (
              <pre className="mt-2 text-xs bg-gray-100 dark:bg-gray-700 p-2 rounded overflow-auto">
                {result.output}
              </pre>
            )}
          </div>
        )}
        
        {result?.success && (
          <div className="mt-4 p-4 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-lg">
            <p className="font-medium">다음 단계:</p>
            <p className="text-sm mt-1">
              Supabase → Database → Tables에서 테이블이 생성되었는지 확인해보세요!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}