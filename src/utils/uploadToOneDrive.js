import { base44 } from '@/api/base44Client';

/**
 * Comprime uma imagem File para base64 JPEG
 */
function compressImage(file, maxWidthPx = 1024, quality = 0.70) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxWidthPx) {
          height = Math.round((height * maxWidthPx) / width);
          width = maxWidthPx;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl.split(',')[1]);
      };
      img.onerror = () => reject(new Error('Erro ao carregar imagem'));
      img.src = readerEvent.target.result;
    };
    reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
    reader.readAsDataURL(file);
  });
}

/**
 * Faz upload de um arquivo File para o OneDrive via backend function.
 */
export async function uploadToOneDrive(file, subfolder = '', stepLabel = '') {
  const base64 = await compressImage(file);

  const labelSlug = stepLabel
    ? stepLabel.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').slice(0, 40)
    : 'foto';
  const safeName = `${labelSlug}_${Date.now()}.jpg`;

  const response = await base44.functions.invoke('uploadPhotoOneDrive', {
    file_base64: base64,
    file_name: safeName,
    mime_type: 'image/jpeg',
    subfolder: subfolder || '',
  });

  // SDK V3+: retorna { data: { ... } }
  const data = response?.data ?? response;

  if (!data) throw new Error('Sem resposta do servidor de upload');
  if (data.error) throw new Error(data.error);
  if (data.success) {
    return {
      preview_url: data.file_url,
      share_url: data.file_url,
    };
  }
  throw new Error(`Falha no upload: ${JSON.stringify(data)}`);
}