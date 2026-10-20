// Display conversions only. Model values, limits and physical laws keep their units.
const groups={
 м:[['м',1],['см',.01],['мм',.001],['км',1000]],
 кг:[['кг',1],['г',.001],['т',1000]],
 с:[['с',1],['мин',60],['ч',3600]],
 'м/с':[['м/с',1],['км/ч',1/3.6]],
 Н:[['Н',1],['кН',1000]],
 В:[['В',1],['мВ',.001],['кВ',1000]],
 Ом:[['Ом',1],['кОм',1000]],
};
export function numberUnits(unit){return (Object.hasOwn(groups,unit)?groups[unit]:[[unit||'Без единицы',1]]).map(([label,scale])=>({label,scale}));}
export function unitNumber(value,scale=1){return scale===1?value:Number((value/scale).toPrecision(15));}
export function modelNumber(raw,scale=1){const value=Number(String(raw).trim().replace(',','.'));if(String(raw).trim()===''||!Number.isFinite(value)||!Number.isFinite(scale)||!(scale>0)||!Number.isFinite(value*scale))throw new Error('Введите конечное число');return scale===1?value:Number((value*scale).toPrecision(15));}
