export type ImageProcessorConfigType = {
  batchSize: number;
  filePath: string;
};

export type RawEntity = {
  index: number;
  id: string;
  url: string;
  thumbnail: Buffer | null;
};

export type CsvResponseRowEntity = {
  index: number;
  id: string;
  url: string;
};
