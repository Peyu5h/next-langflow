import ApiNode from "./ApiNode";
import CalculatorNode from "./CalculatorNode";
import ConditionNode from "./ConditionNode";
import DataProcessNode from "./DataProcessNode";
import InputNode from "./InputNode";
import OutputNode from "./OutputNode";
import AgeConditionNode from "./AgeConditionNode";

export const nodeTypes = {
  inputNode: InputNode,
  apiNode: ApiNode,
  conditionNode: ConditionNode,
  outputNode: OutputNode,
  dataProcessNode: DataProcessNode,
  calculatorNode: CalculatorNode,
  ageConditionNode: AgeConditionNode,
};
