import { X, ChevronLeft, ChevronRight, ExternalLink, ImageOff, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';

function isOneDriveUrl(url) {
  if (!url) return false;
  return url.includes('sharepoint.com') || url.includes('1drv.ms') || url.includes('onedrive.live.com');
}

export default function PhotoLightbox({ photos, initialIndex = 0, onClose }) {
  const [index, setIndex] = useState(initialIndex);
  const [imgError, setImgError] = useState(false);
  const [imgLoading, setImgLoading] = useState(true);

  useEffect(() => {
    setImgError(false);
    setImgLoading(true);
  }, [index]);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') setIndex(i => Math.max(0, i - 1));
      if (e.key === 'ArrowRight') setIndex(i => Math.min(photos.length - 1, i + 1));
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [photos.length, onClose]);

  const photo = photos[index];
  const photoUrl = photo.share_url || photo.photo_url || photo.preview_url;
  const photoTitle = photo.step_title || '';
  const isOneDrive = isOneDriveUrl(photoUrl);

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/90 p-4"
      onClick={onClose}
    >
      {/* Fechar */}
      <button
        className="absolute top-4 right-4 text-white bg-white/10 hover:bg-white/20 rounded-full p-2 z-10"
        onClick={onClose}
      >
        <X className="w-5 h-5" />
      </button>

      {/* Título */}
      {photoTitle && (
        <p className="absolute top-4 left-0 right-0 text-center text-white text-sm font-medium px-14 truncate">
          {photoTitle}
        </p>
      )}

      {/* Esquerda */}
      {photos.length > 1 && index > 0 && (
        <button
          className="absolute left-3 top-1/2 -translate-y-1/2 text-white bg-white/10 hover:bg-white/20 rounded-full p-2"
          onClick={e => { e.stopPropagation(); setIndex(i => i - 1); }}
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
      )}

      {/* Conteúdo */}
      <div onClick={e => e.stopPropagation()} className="max-w-full max-h-full flex flex-col items-center justify-center gap-4">
        {isOneDrive || imgError ? (
          // OneDrive precisa de auth — não renderiza como <img>, mostra card com link
          <div className="flex flex-col items-center gap-4 p-8 bg-white/10 rounded-2xl text-center max-w-xs">
            <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center">
              <ImageOff className="w-7 h-7 text-blue-300" />
            </div>
            <div>
              <p className="text-white font-semibold text-sm mb-1">Foto no OneDrive</p>
              <p className="text-white/60 text-xs">A foto está armazenada no OneDrive. Clique abaixo para visualizá-la.</p>
            </div>
            {photoUrl && (
              <a
                href={photoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors"
                onClick={e => e.stopPropagation()}
              >
                <ExternalLink className="w-4 h-4" />
                Abrir no OneDrive
              </a>
            )}
          </div>
        ) : (
          <>
            <div className="relative flex items-center justify-center">
              {imgLoading && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-white/60 animate-spin" />
                </div>
              )}
              <img
                src={`${photoUrl}${photoUrl.includes('?') ? '&' : '?'}t=${Math.floor(Date.now()/300000)}`}
                alt={photoTitle}
                className={`max-w-[90vw] max-h-[75vh] object-contain rounded-lg shadow-2xl transition-opacity duration-300 ${imgLoading ? 'opacity-0' : 'opacity-100'}`}
                onLoad={() => setImgLoading(false)}
                onError={() => { setImgError(true); setImgLoading(false); }}
              />
            </div>
            {photoUrl && !imgLoading && (
              <a
                href={photoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-white/50 hover:text-white/80 text-xs transition-colors"
                onClick={e => e.stopPropagation()}
              >
                <ExternalLink className="w-3 h-3" /> Abrir externamente
              </a>
            )}
          </>
        )}
      </div>

      {/* Direita */}
      {photos.length > 1 && index < photos.length - 1 && (
        <button
          className="absolute right-3 top-1/2 -translate-y-1/2 text-white bg-white/10 hover:bg-white/20 rounded-full p-2"
          onClick={e => { e.stopPropagation(); setIndex(i => i + 1); }}
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      )}

      {/* Contador */}
      {photos.length > 1 && (
        <p className="absolute bottom-4 text-white/60 text-xs">{index + 1} / {photos.length}</p>
      )}
    </div>
  );
}