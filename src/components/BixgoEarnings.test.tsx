import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BixgoEarnings } from './BixgoEarnings';
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
describe('Driver earnings export', () => {
  it('exports only completed trips selected by the payment filter', () => {
    const completed = { id: 'completed-bix', status: 'completed', created_at: new Date().toISOString(), total_idr: 160000, pickup: 'Pickup', dropoff: 'Destination', km: 2, service: 'ride', city: 'makassar' };
    let exported: Blob | undefined;
    vi.spyOn(URL, 'createObjectURL').mockImplementation(blob => { exported = blob as Blob; return 'blob:earnings'; });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const ui = render(<BixgoEarnings trips={[{ ...completed, pay_method: 'BIX Token', fare_bix: 20, driver_bix: 17 }, { ...completed, id: 'completed-cash', pay_method: 'Cash', gas_bix: 3 }, { ...completed, id: 'unfinished-bix', status: 'assigned', pay_method: 'BIX Token' }]}/>);
    fireEvent.change(ui.getByLabelText('Payment filter'), { target: { value: 'bix' } });
    fireEvent.click(ui.getByLabelText('Download earnings CSV'));
    expect(exported?.size).toBeGreaterThan(0);
    expect(ui.container.querySelectorAll('details')).toHaveLength(1);
  });
});