'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import UserImageSubmission from '@/components/UserImageSubmission';

interface SubmittedImage {
  id: string;
  imageUrl: string;
  title?: string;
  description?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  submittedBy: {
    id: string;
    name: string;
    email: string;
  };
}

export default function ImageSubmitPage() {
  const { data: session } = useSession();
  const [myImages, setMyImages] = useState<SubmittedImage[]>([]);
  const [loading, setLoading] = useState(false);

  const loadMyImages = async () => {
    if (!session?.user) return;

    setLoading(true);
    try {
      const response = await fetch('/api/images/submit');
      if (response.ok) {
        const data = await response.json();
        setMyImages(data.images.filter((img: SubmittedImage) => img.submittedBy.id === session.user.id));
      }
    } catch (error) {
      console.error('이미지 목록 로딩 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMyImages();
  }, [session]);

  const getStatusText = (status: string) => {
    switch (status) {
      case 'PENDING':
        return '검토 중';
      case 'APPROVED':
        return '승인됨';
      case 'REJECTED':
        return '거부됨';
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'text-yellow-700 bg-yellow-100 dark:text-yellow-300 dark:bg-yellow-900/30';
      case 'APPROVED':
        return 'text-green-700 bg-green-100 dark:text-green-300 dark:bg-green-900/30';
      case 'REJECTED':
        return 'text-red-700 bg-red-100 dark:text-red-300 dark:bg-red-900/30';
      default:
        return 'text-gray-700 bg-gray-100 dark:text-gray-300 dark:bg-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            이미지 제출
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            베어브릭 관련 이미지를 제출하고 관리할 수 있습니다.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Upload Form */}
          <div>
            <UserImageSubmission onImageSubmitted={loadMyImages} />
          </div>

          {/* My Submitted Images */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              내가 제출한 이미지
            </h2>

            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600 dark:text-gray-400">로딩 중...</p>
              </div>
            ) : myImages.length === 0 ? (
              <div className="bg-white dark:bg-gray-900 rounded-lg shadow-md p-6 text-center">
                <p className="text-gray-600 dark:text-gray-400">
                  아직 제출한 이미지가 없습니다.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {myImages.map((image) => (
                  <div
                    key={image.id}
                    className="bg-white dark:bg-gray-900 rounded-lg shadow-md overflow-hidden"
                  >
                    <div className="flex">
                      <div className="w-24 h-24 flex-shrink-0">
                        <img
                          src={image.imageUrl}
                          alt={image.title || '제출된 이미지'}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-medium text-gray-900 dark:text-white">
                            {image.title || '제목 없음'}
                          </h3>
                          <span
                            className={`px-2 py-1 text-xs rounded-full ${getStatusColor(
                              image.status
                            )}`}
                          >
                            {getStatusText(image.status)}
                          </span>
                        </div>
                        {image.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                            {image.description}
                          </p>
                        )}
                        <p className="text-xs text-gray-500">
                          {new Date(image.createdAt).toLocaleDateString('ko-KR')}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}