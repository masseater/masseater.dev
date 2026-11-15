import { useState } from "react";

export const StatefulWidget = () => {
  const [count] = useState(0);
  return <p onClick={() => count}>{count}</p>;
};
