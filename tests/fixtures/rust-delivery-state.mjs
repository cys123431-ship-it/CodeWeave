// F01 acceptance replay, frozen at ec4590520026337e902505872b9b41d6bda4e475.
// Keep current lesson/file mappings for validation, but never inherit later progress.
const completed = new Set([
  'A02', 'A03', 'A04',
  'B01', 'B02', 'B03', 'B04', 'B05', 'B06', 'B07', 'B08', 'B09', 'B10',
  'C01', 'C02', 'C03', 'C04', 'C05', 'D01', 'D02', 'E01', 'E02'
]);
const inProgress = new Set(['C06', 'F01', 'F02']);

export function historicalRustPending(source) {
  const data = structuredClone(source);
  for (const stage of data.stages) {
    for (const unit of stage.units) {
      unit.status = completed.has(unit.id) ? '완료' : inProgress.has(unit.id) ? '진행 중' : '미착수';
      // Later delivery evidence belongs to live progress, not this historical replay.
      if (unit.id !== 'F01') delete unit.theoryDelivery;
      delete unit.practiceDelivery;
    }
  }
  data.next = { track: 'F-G', unit: 'F01' };
  return data;
}
