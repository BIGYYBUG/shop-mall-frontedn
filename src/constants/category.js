/**
 * 商品分类常量。
 *
 * 后端暂无分类列表/树接口（交接文档 §6 已知缺口），ProductDTO.categoryId 是裸 ID。
 * 前端先用固定字典做下拉；等后端补 /category/list 后整体替换此文件即可，
 * 所有引用处只依赖 CATEGORY_OPTIONS 结构，不受影响。
 *
 * ID 取值需与数据库 mall_category（或约定种子数据）对齐——当前为前端占位。
 */
export const CATEGORY_OPTIONS = [
  { id: 1, name: '手机数码' },
  { id: 2, name: '服饰鞋包' },
  { id: 3, name: '美妆个护' },
  { id: 4, name: '家居生活' },
  { id: 5, name: '食品生鲜' },
  { id: 6, name: '运动户外' }
]

/** id → 名称；查不到返回 null（表格展示兜底由调用方处理） */
export const categoryName = (id) =>
  CATEGORY_OPTIONS.find((c) => c.id === id)?.name ?? null
