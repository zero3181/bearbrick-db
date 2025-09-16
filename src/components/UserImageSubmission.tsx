'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';

interface UserImageSubmissionProps {
  onImageSubmitted?: () => void;
}

export default function UserImageSubmission({ onImageSubmitted }: UserImageSubmissionProps) {
  const { data: session } = useSession();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!session?.user) {
      alert('로그인이 필요합니다.');
      return;
    }

    if (!file) {
      alert('이미지를 선택해주세요.');
      return;
    }

    setUploading(true);

    try {
      // First upload the file
      const formData = new FormData();
      formData.append('file', file);

      const uploadResponse = await fetch('/api/images/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        const error = await uploadResponse.json();
        throw new Error(error.error || '파일 업로드에 실패했습니다.');
      }

      const { imageUrl } = await uploadResponse.json();

      setSubmitting(true);

      // Then submit the image information
      const submitResponse = await fetch('/api/images/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrl,
          title: title.trim() || null,
          description: description.trim() || null,
        }),
      });

      if (!submitResponse.ok) {
        const error = await submitResponse.json();
        throw new Error(error.error || '이미지 제출에 실패했습니다.');
      }

      // Reset form
      setFile(null);
      setTitle('');
      setDescription('');
      setPreview(null);

      alert('이미지가 성공적으로 제출되었습니다! 관리자 승인 후 공개됩니다.');

      if (onImageSubmitted) {
        onImageSubmitted();
      }

    } catch (error) {
      console.error('이미지 업로드 오류:', error);
      alert(error instanceof Error ? error.message : '이미지 업로드에 실패했습니다.');
    } finally {
      setUploading(false);
      setSubmitting(false);
    }
  };

  if (!session?.user) {
    return (
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 text-center">
        <p className="text-gray-600 dark:text-gray-400">
          이미지를 업로드하려면 로그인이 필요합니다.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
        이미지 업로드
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* File Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            이미지 선택
          </label>
          <input
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900 dark:file:text-blue-300"
            disabled={uploading || submitting}
          />
          <p className="mt-1 text-xs text-gray-500">
            JPEG, PNG, GIF, WebP 파일만 업로드 가능 (최대 5MB)
          </p>
        </div>

        {/* Preview */}
        {preview && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              미리보기
            </label>
            <img
              src={preview}
              alt="Preview"
              className="max-w-full h-48 object-contain rounded-lg border border-gray-200 dark:border-gray-700"
            />
          </div>
        )}

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            제목 (선택사항)
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
            placeholder="이미지 제목을 입력하세요"
            disabled={uploading || submitting}
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            설명 (선택사항)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
            placeholder="이미지에 대한 설명을 입력하세요"
            disabled={uploading || submitting}
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={!file || uploading || submitting}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition-colors"
        >
          {uploading ? '파일 업로드 중...' : submitting ? '제출 중...' : '이미지 제출'}
        </button>
      </form>

      <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
        <p className="text-sm text-blue-700 dark:text-blue-300">
          💡 제출된 이미지는 관리자 검토 후 승인되면 공개됩니다.
        </p>
      </div>
    </div>
  );
}