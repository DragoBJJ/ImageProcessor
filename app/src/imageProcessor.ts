import {default as axios} from "axios";
import fs from "fs";
import {chunk} from "lodash";
import mongoose from "mongoose";
import sharp from "sharp";
import {
  CsvResponseRowEntity,
  ImageProcessorConfigType,
  RawEntity,
} from "./type";

mongoose.connect(process.env.MONGO_URI || "");

const ImageSchema = new mongoose.Schema({
  id: {type: String, required: true},
  index: {type: Number, required: true},
  thumbnail: {type: Buffer, required: true},
});

const ImageModel = mongoose.model("Image", ImageSchema);

export class ImageProcessor {
  private logger: Console;
  constructor(private config: ImageProcessorConfigType) {
    this.logger = console;
  }

  private getData(): RawEntity[] {
    const data = fs.readFileSync(this.config.filePath, "utf-8");
    const rows: CsvResponseRowEntity[] = this.parseCSV(data);
    return rows.map((row) => ({
      index: row.index,
      id: row.id,
      url: row.url,
      thumbnail: null,
    }));
  }

  private async processChunks(rawList: RawEntity[], batchSize: number) {
    const chunks = chunk(rawList, this.config.batchSize).map((chunk: any) => {
      return new Promise(async (resolve) => {
        const images = await this.processChunk(chunk, this.config.batchSize);
        await ImageModel.insertMany(images, {ordered: false});
        this.logger.info(`Processed batch size: ${images.length}`);
        this.logger.info(
          `Last processed index: ${
            chunk[chunk.length - 1].index
          }, Last processed ID: ${chunk[chunk.length - 1].id}`
        );
        if (global.gc) global.gc();
        resolve(true);
      }).catch((error) => {
        this.logger.error(`Error processing batch: ${error.message}`);
      });
    });
    this.logger.info("Starting batch...");
    return Promise.all(chunks);
  }

  async start() {
    const rawList = this.getData();
    const chunks = await this.processChunks(rawList, this.config.batchSize);

    console.log("All chunks processed", chunks);
  }

  async processChunk(rawEntities: any, batchSize: number) {
    const tasks = rawEntities.map((rawEntity: any) =>
      this.createThumbnail(rawEntity)
    );

    return Promise.all(tasks);
  }

  async createThumbnail(rawEntity: any) {
    try {
      const response: {data: string | Buffer} = await axios.get(rawEntity.url, {
        responseType: "arraybuffer",
      });
      const buffer = await sharp(response.data).resize(100, 100).toBuffer();

      rawEntity.thumbnail = buffer;
      delete rawEntity.url;
      return rawEntity;
    } catch (error: any) {
      this.logger.error(
        `Error creating thumbnail for ID ${rawEntity.id}: ${error.message}`
      );
      return null;
    }
  }

  parseCSV(data: any) {
    const rows = data.split("\n");
    const headers = rows.shift().split(",");
    return rows.map((row: any) => {
      const values = row.split(",");
      return headers.reduce((obj: any, header: any, index: any) => {
        obj[header.trim()] = values[index]?.trim();
        return obj;
      }, {});
    });
  }
}
