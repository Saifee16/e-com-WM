export interface CategoryCountNode {
  productCount: number;
  children: CategoryCountNode[];
}

/**
 * Roll active direct-product counts up through the returned category tree.
 * Direct counts are already filtered by the caller, so discarded products and
 * other non-active products remain excluded from every ancestor count.
 */
export const aggregateCategoryProductCounts = (roots: CategoryCountNode[]) => {
  const aggregate = (node: CategoryCountNode): number => {
    const descendantCount = node.children.reduce((total, child) => total + aggregate(child), 0);
    node.productCount += descendantCount;
    return node.productCount;
  };

  roots.forEach(aggregate);
  return roots;
};
