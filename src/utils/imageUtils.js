// src/utils/imageUtils.js
import imageCompression from 'browser-image-compression';

export const comprimirImagem = async (arquivo) => {
  // Se não for um arquivo de imagem válido, retorna o próprio arquivo
  if (!arquivo || !(arquivo instanceof File)) return arquivo;

  const options = {
    maxSizeMB: 0.3,          // Tamanho máximo (~300KB)
    maxWidthOrHeight: 1080,  // Redimensiona para resolução HD
    useWebWorker: true,
    fileType: 'image/webp'   // Converte para WebP (mais leve)
  };

  try {
    const imagemComprimida = await imageCompression(arquivo, options);
    return imagemComprimida;
  } catch (error) {
    console.error("Erro ao comprimir imagem:", error);
    return arquivo; // Se der erro, retorna a imagem original em fallback
  }
};