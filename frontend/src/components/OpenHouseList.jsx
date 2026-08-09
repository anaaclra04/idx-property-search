import './OpenHouseList.css';

// Debug Challenge: remarks never showed up even for open houses that had
// them. The backend's /openhouses endpoint returns the raw `all_data`
// column as-is
//  it's a JSON blob, and OpenHouseRemarks lives inside it, not as its own column. 
// Parse it here on the frontend instead of touching the API.
function extractRemarks(allData) {
  if (!allData) return null;
  try {
    const parsed = typeof allData === 'string' ? JSON.parse(allData) : allData;
    return parsed?.OpenHouseRemarks || null;
  } catch {
    return null; // malformed/NULL all_data for this row -- just omit remarks
  }
}

function formatDate(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTime(value) {
  if (!value) return '';
  const [h, m] = String(value).split(':');
  const hour = Number(h);
  if (Number.isNaN(hour)) return String(value);
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:${m} ${period}`;
}

export default function OpenHouseList({ openHouses = [] }) {
  if (openHouses.length === 0) {
    return <p className="openhouse-list__empty">No open houses scheduled</p>;
  }

  return (
    <ul className="openhouse-list">
      {openHouses.map((oh) => {
        const remarks = extractRemarks(oh.all_data);
        return (
          <li key={oh.id} className="openhouse-list__item">
            <div className="openhouse-list__date">{formatDate(oh.OpenHouseDate)}</div>
            <div className="openhouse-list__time">
              {formatTime(oh.OH_StartTime)} – {formatTime(oh.OH_EndTime)}
            </div>
            {remarks && <p className="openhouse-list__remarks">{remarks}</p>}
          </li>
        );
      })}
    </ul>
  );
}