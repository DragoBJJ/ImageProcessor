import axios from "axios";
import fs from "fs";
import {chunk} from "lodash";
import {connect, model, Schema} from "mongoose";
import path from "path";
import sharp, {SharpOptions} from "sharp";

type RawEntity = {
  url?: string | undefined;
  id: string;
  thumbnail: Buffer | null;
};

connect(process.env.MONGO_URI!);

interface IImage {
  id: string;
  index: number;
  thumbnail: Buffer;
}

type Response<T> = {
  data: T;
};

const ImageSchema = new Schema<IImage>({
  id: {type: String, required: true},
  index: {type: Number, required: true},
  thumbnail: {type: Buffer, required: true},
});

const ImageModel = model("Image", ImageSchema);

class ImageProcessor {
  logger: Console;
  constructor() {
    this.logger = console;
  }

  async start() {
    const batchSize = parseInt(process.env.DEFAULT_BATCH_SIZE!, 10);
    const filePath = path.join(__dirname, `data/data.csv`);
    const data = fs.readFileSync(filePath, "utf-8");
    const rows: RawEntity[] = this.parseCSV(data) as RawEntity[];

    this.logger.info(`Batch size: ${batchSize}`);
    this.logger.info(`Items: ${rows.length}`);

    const rawList = rows.map((row: RawEntity) => ({
      index: row.id,
      id: row.id,
      url: row.url,
      thumbnail: null,
    }));

    const chunks = chunk(rawList, batchSize);

    this.logger.info("Starting batch...");

    for (const chunk of chunks) {
      try {
        const images = await this.processChunk(chunk, batchSize);

        await ImageModel.insertMany(images, {ordered: false});

        this.logger.info(`Processed batch size: ${images.length}`);
        // this.logger.info(
        //   `Last processed index: ${
        //     chunk[chunk.length - 1].index
        //   }, Last processed ID: ${chunk[chunk.length - 1].id}`
        // );

        if (global.gc) global.gc();
      } catch (error: any) {
        this.logger.error(`Error processing batch: ${error.message}`);
      }
    }
  }

  async processChunk(rawEntities: RawEntity[], batchSize: unknown) {
    const tasks = rawEntities.map((rawEntity) =>
      this.createThumbnail(rawEntity)
    );

    const results = await Promise.allSettled(tasks);

    return results
      .map((result) => (result.status === "fulfilled" ? result.value : null))
      .filter(Boolean);
  }

  async createThumbnail(rawEntity: {
    url?: string;
    id: string;
    thumbnail: Buffer | null;
  }) {
    try {
      const response: Response<SharpOptions> = await axios.get(
        rawEntity.url || "",
        {
          responseType: "arraybuffer",
        }
      );

      const buffer = await sharp(response.data).resize(100, 100).toBuffer();

      rawEntity.thumbnail = buffer;
      delete rawEntity.url;
      return rawEntity;
    } catch (error: unknown) {
      this.logger.error(
        `Error creating thumbnail for ID ${rawEntity.id}: ${
          (error as any)?.message
        }`
      );
      return null;
    }
  }

  parseCSV(data: string) {
    const rows = data.split("\n");
    const headers = (rows.shift() || "").split(",");
    return rows.map((row) => {
      const values = row.split(",");
      return headers.reduce((obj: {[key: string]: any}, header, index) => {
        obj[header.trim()] = values[index]?.trim();
        return obj;
      }, {});
    });
  }
}

module.exports = ImageProcessor;
