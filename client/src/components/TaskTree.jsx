import TaskRow from './TaskRow';

export default function TaskTree({ tasks, onTaskClick }) {
  const buildTree = (tasks, parentId = null) => {
    return tasks
      .filter((t) => (t.parent_id || null) === parentId)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((t) => ({
        ...t,
        children: buildTree(tasks, t.id),
      }));
  };

  const tree = buildTree(tasks);

  const renderRows = (nodes, depth = 0) => {
    return nodes.flatMap((node) => [
      <TaskRow key={node.id} task={node} depth={depth} onClick={onTaskClick} />,
      ...renderRows(node.children || [], depth + 1),
    ]);
  };

  return <div>{renderRows(tree)}</div>;
}
