import { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { Calculator } from 'lucide-react';
import PropTypes from 'prop-types';

// Utility functions moved outside component
const calculateVariance = (currentValue, originalValue) => {
  return ((currentValue - originalValue) / originalValue * 100).toFixed(2);
};

// Memoized TableRow component
const TableRow = memo(({ row, level, inputValue, onInputChange, onValueChange, originalValue }) => {
  const indent = level * 20;
  
  const variance = useMemo(() => 
    originalValue && calculateVariance(row.value, originalValue),
    [row.value, originalValue]
  );

  const handleInputChange = useCallback((e) => {
    onInputChange(row.id, e.target.value);
  }, [row.id, onInputChange]);

  const handlePercentageChange = useCallback(() => {
    onValueChange(row.id, 'percentage', inputValue);
  }, [row.id, inputValue, onValueChange]);

  const handleDirectChange = useCallback(() => {
    onValueChange(row.id, 'direct', inputValue);
  }, [row.id, inputValue, onValueChange]);

  return (
    <tr className="border-b hover:bg-gray-50 transition-colors">
      <td className="p-2" style={{ paddingLeft: `${indent}px` }}>
        {level > 0 && '└─ '}{row.label}
      </td>
      <td className="p-2 text-right font-medium">
        {row.value.toFixed(2)}
      </td>
      <td className="p-2">
        <input
          type="number"
          className="w-24 p-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={inputValue || ''}
          onChange={handleInputChange}
          placeholder="Enter value"
        />
      </td>
      <td className="p-2">
        <button
          className="flex items-center px-3 py-1 mr-2 text-white bg-blue-500 rounded hover:bg-blue-600 transition-colors"
          onClick={handlePercentageChange}
        >
          <Calculator className="w-4 h-4 mr-1" />
          %
        </button>
      </td>
      <td className="p-2">
        <button
          className="flex items-center px-3 py-1 text-white bg-green-500 rounded hover:bg-green-600 transition-colors"
          onClick={handleDirectChange}
        >
          <Calculator className="w-4 h-4 mr-1" />
          Val
        </button>
      </td>
      <td className="p-2 text-right">
        {variance && (
          <span className={`${Number(variance) > 0 ? 'text-green-600' : 'text-red-600'}`}>
            {variance}%
          </span>
        )}
      </td>
    </tr>
  );
});

TableRow.displayName = 'TableRow';

// Enhanced PropTypes
TableRow.propTypes = {
  row: PropTypes.shape({
    id: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
    value: PropTypes.number.isRequired,
    children: PropTypes.arrayOf(PropTypes.object)
  }).isRequired,
  level: PropTypes.number.isRequired,
  inputValue: PropTypes.string,
  onInputChange: PropTypes.func.isRequired,
  onValueChange: PropTypes.func.isRequired,
  originalValue: PropTypes.number
};

// Memoized utility functions
const updateParentValues = (rows) => {
  return rows.map(row => {
    if (row.children) {
      const updatedChildren = updateParentValues(row.children);
      return {
        ...row,
        children: updatedChildren,
        value: updatedChildren.reduce((sum, child) => sum + child.value, 0)
      };
    }
    return row;
  });
};

const distributeToChildren = (row, newValue) => {
  if (!row.children) return row;

  const totalChildrenValue = row.children.reduce((sum, child) => sum + child.value, 0);
  const ratio = newValue / totalChildrenValue;

  return {
    ...row,
    value: newValue,
    children: row.children.map(child => ({
      ...child,
      value: Number((child.value * ratio).toFixed(2))
    }))
  };
};

const HierarchicalTable = () => {
  const [tableData, setTableData] = useState({
    rows: [
      {
        id: "electronics",
        label: "Electronics",
        value: 1500,
        children: [
          {
            id: "phones",
            label: "Phones",
            value: 800
          },
          {
            id: "laptops",
            label: "Laptops",
            value: 700
          }
        ]
      },
      {
        id: "furniture",
        label: "Furniture",
        value: 1000,
        children: [
          {
            id: "tables",
            label: "Tables",
            value: 300
          },
          {
            id: "chairs",
            label: "Chairs",
            value: 700
          }
        ]
      }
    ]
  });

  const [inputValues, setInputValues] = useState({});
  const [originalValues, setOriginalValues] = useState({});

  // Memoized initial values calculation
  useEffect(() => {
    const storeOriginalValues = (rows) => {
      return rows.reduce((values, row) => {
        values[row.id] = row.value;
        if (row.children) {
          Object.assign(values, storeOriginalValues(row.children));
        }
        return values;
      }, {});
    };
    setOriginalValues(storeOriginalValues(tableData.rows));
  }, []);

  const handleValueChange = useCallback((rowId, type, value) => {
    if (!value || isNaN(value)) return;

    setTableData(prevData => {
      const updateRowValue = (rows) => {
        return rows.map(row => {
          if (row.id === rowId) {
            const currentValue = row.value;
            let newValue = currentValue;

            if (type === 'percentage') {
              newValue = currentValue + (currentValue * (Number(value) / 100));
            } else if (type === 'direct') {
              newValue = Number(value);
            }

            if (row.children) {
              return distributeToChildren(row, newValue);
            }

            return { ...row, value: Number(newValue.toFixed(2)) };
          }

          if (row.children) {
            return { ...row, children: updateRowValue(row.children) };
          }

          return row;
        });
      };

      const updatedRows = updateRowValue(prevData.rows);
      const finalRows = updateParentValues(updatedRows);
      return { ...prevData, rows: finalRows };
    });

    setInputValues(prev => ({ ...prev, [rowId]: '' }));
  }, []);

  const handleInputChange = useCallback((id, value) => {
    setInputValues(prev => ({ ...prev, [id]: value }));
  }, []);

  // Memoized rows rendering
  const renderedRows = useMemo(() => {
    const renderRows = (rows, level = 0) => {
      return rows.flatMap(row => [
        <TableRow
          key={row.id}
          row={row}
          level={level}
          inputValue={inputValues[row.id]}
          onInputChange={handleInputChange}
          onValueChange={handleValueChange}
          originalValue={originalValues[row.id]}
        />,
        ...(row.children ? renderRows(row.children, level + 1) : [])
      ]);
    };
    return renderRows(tableData.rows);
  }, [tableData.rows, inputValues, originalValues, handleInputChange, handleValueChange]);

  // Memoized grand total calculation
  const grandTotal = useMemo(() => {
    const calculateGrandTotal = (rows) => {
      return rows.reduce((total, row) => {
        if (!row.children) return total + row.value;
        return total + calculateGrandTotal(row.children);
      }, 0);
    };
    return calculateGrandTotal(tableData.rows);
  }, [tableData.rows]);

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2 text-left">Label</th>
              <th className="p-2 text-right">Value</th>
              <th className="p-2">Input</th>
              <th className="p-2">Allocation %</th>
              <th className="p-2">Allocation Val</th>
              <th className="p-2 text-right">Variance %</th>
            </tr>
          </thead>
          <tbody>
            {renderedRows}
            <tr className="font-bold bg-gray-50">
              <td className="p-2">Grand Total</td>
              <td className="p-2 text-right">{grandTotal.toFixed(2)}</td>
              <td colSpan={4}></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default HierarchicalTable;