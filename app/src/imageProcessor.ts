import {default as axios} from "axios";
import fs from "fs";
import {chunk} from "lodash";
import mongoose from "mongoose";
import sharp from "sharp";
import {ImageSchema} from "./model";
import {
  CsvResponseRawEntity,
  ImageProcessorConfigType,
  RawEntity,
  ThumbnailResponse,
} from "./type";

mongoose.connect(process.env.MONGO_URI || "");
const ImageModel = mongoose.model("Image", ImageSchema);

export class ImageProcessor {
  private logger: Console;
  constructor(private config: ImageProcessorConfigType) {
    this.logger = console;
  }

  private createRawEntity({index, id, url}: CsvResponseRawEntity) {
    return {
      index,
      id,
      url,
      thumbnail: null,
    };
  }

  private getData(): RawEntity[] {
    const data = fs.readFileSync(this.config.filePath, "utf-8");
    const rows: CsvResponseRawEntity[] = this.parseCSV(data);
    return rows.map((row) => this.createRawEntity(row));
  }

  private async addNewImages(images: any[]) {
    await ImageModel.insertMany(images, {ordered: false});
  }

  private displayChunkData(chunk: RawEntity[]) {
    const lastIndex = chunk.length - 1;
    const lastChunk = chunk[lastIndex];
    console.log("--------------------");
    this.logger.info(`Processed batch size: ${this.config.batchSize}`);
    this.logger.info(`Last processed index: ${lastChunk.index}`);
    this.logger.info(`Last processed ID: ${lastChunk.id}`);
    console.log("--------------------");
  }

  private cleanMemory() {
    if (global.gc) global.gc();
  }

  private async processChunks(rawList: RawEntity[], batchSize: number) {
    const chunks = chunk(rawList, batchSize).map((chunk) =>
      this.processChunk(chunk)
    );
    return Promise.all(chunks);
  }

  async start() {
    const rawData = this.getData();
    await this.processChunks(rawData, this.config.batchSize);
    console.log("All chunks processed");
  }

  async processChunk(chunk: RawEntity[]) {
    return new Promise(async (resolve) => {
      const images = await this.createThumbnails(chunk);
      if (images.length) await this.addNewImages(images);
      this.displayChunkData(chunk);
      this.cleanMemory();
      resolve(true);
    }).catch((error) => {
      this.logger.error(`Error processing batch: ${error.message}`);
    });
  }

  private async createThumbnails(rawEntities: RawEntity[]) {
    const tasks = rawEntities.map((rawEntity) => this.getThumbnail(rawEntity));
    const images = await Promise.all(tasks);
    return images.filter((image) => image !== null);
  }

  createThumbnail(rawEntity: RawEntity, buffer: Buffer) {
    rawEntity.thumbnail = buffer;
    delete rawEntity.url;
    return rawEntity;
  }

  async getThumbnail(rawEntity: RawEntity) {
    try {
      const response: ThumbnailResponse = await axios.get(rawEntity.url || "", {
        responseType: "arraybuffer",
      });
      const buffer = await sharp(response.data).resize(100, 100).toBuffer();
      return this.createThumbnail(rawEntity, buffer);
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
