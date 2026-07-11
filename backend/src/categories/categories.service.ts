import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './category.entity';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly repo: Repository<Category>,
  ) {}

  findAll(userId: string): Promise<Category[]> {
    return this.repo.find({
      where: { userId },
      order: { kind: 'ASC', name: 'ASC' },
    });
  }

  create(userId: string, dto: CreateCategoryDto): Promise<Category> {
    const category = this.repo.create({ ...dto, userId });
    return this.repo.save(category);
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateCategoryDto,
  ): Promise<Category> {
    const category = await this.repo.findOne({ where: { id, userId } });
    if (!category) throw new NotFoundException('Category not found');
    Object.assign(category, dto);
    return this.repo.save(category);
  }

  async remove(userId: string, id: string): Promise<void> {
    const result = await this.repo.delete({ id, userId });
    if (!result.affected) throw new NotFoundException('Category not found');
  }
}
