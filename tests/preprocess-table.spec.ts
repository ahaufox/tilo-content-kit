import { describe, it, expect } from 'vitest';
import { preprocessMarkdownTable } from '../src/internal/markdown/table-preprocessor';

describe('preprocessMarkdownTable 表格防御性预处理', () => {
  it('保护空表格行与空单元格不被误拆为多行', () => {
    const emptyTable = [
      '|  |  |  |',
      '| --- | --- | --- |',
      '|  |  |  |',
      '|  |  |  |',
    ].join('\n');

    const result = preprocessMarkdownTable(emptyTable);
    expect(result).toBe(emptyTable);
  });

  it('保护单行内包含空单元格的正常数据行', () => {
    const tableWithEmptyCell = [
      '| 姓名 | 年龄 | 性别 |',
      '| --- | --- | --- |',
      '| 张三 |  | 男 |',
      '|  | 20 | 女 |',
      '| 王五 | 30 |  |',
    ].join('\n');

    const result = preprocessMarkdownTable(tableWithEmptyCell);
    expect(result).toBe(tableWithEmptyCell);
  });

  it('正确修复表头与分隔行粘连异常', () => {
    const glued = '| 姓名 | 年龄 | | --- | --- |';
    const result = preprocessMarkdownTable(glued);
    expect(result).toBe('| 姓名 | 年龄 |\n| --- | --- |');
  });

  it('正确修复分隔行与数据行粘连异常', () => {
    const glued = '| --- | --- | | 张三 | 18 |';
    const result = preprocessMarkdownTable(glued);
    expect(result).toBe('| --- | --- |\n| 张三 | 18 |');
  });

  it('正确修复连续无空格双竖线粘连', () => {
    const glued = '| 列1 | 列2 || 列3 | 列4 |';
    const result = preprocessMarkdownTable(glued);
    expect(result).toBe('| 列1 | 列2 |\n| 列3 | 列4 |');
  });

  it('确保表格前后紧挨普通文本时自动补充隔离空行', () => {
    const text = '前置段落\n| A | B |\n| --- | --- |\n| 1 | 2 |\n后置段落';
    const result = preprocessMarkdownTable(text);
    expect(result).toBe('前置段落\n\n| A | B |\n| --- | --- |\n| 1 | 2 |\n\n后置段落');
  });
});
