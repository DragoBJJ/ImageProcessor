export type ImageProcessorConfigType = {
  batchSize: number;
  filePath: string;
};

export type CsvResponseRawEntity = {
  index: number;
  id: string;
  url: string;
};

export type RawEntity = {
  index: number;
  id: string;
  url?: string;
  thumbnail: Buffer | null;
};

export type ChunkType = {
  index: string;
} & RawEntity;

export type ImageType = {
  id: string;
  index: number;
  thumbnail: Buffer;
};

export type ThumbnailResponse = {
  data: string | Buffer;
};
