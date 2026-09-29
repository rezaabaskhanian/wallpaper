package dto

type TrackRequest struct {
	DeviceID   string `json:"deviceId"`
	Event      string `json:"event"`
	AppVersion string `json:"appVersion"`
	Method     string `json:"method"`
	Source     string `json:"source"`
}

type DailyStats struct {
	Date             string `json:"date"`
	Opens            int64  `json:"opens"`
	ActiveDevices    int64  `json:"activeDevices"`
	NewDevices       int64  `json:"newDevices"`
	WallpaperSets    int64  `json:"wallpaperSets"`
	WallpaperSetters int64  `json:"wallpaperSetters"`
}

// CohortStats ماندگاری یک گروه از کاربران جدید. D1Eligible/D7Eligible فقط
// کاربرانی را می‌شمارد که روز ۱/۷شان رسیده؛ درصد = Retained / Eligible.
type CohortStats struct {
	Label            string `json:"label"`
	NewDevices       int64  `json:"newDevices"`
	SetWallpaperDay0 int64  `json:"setWallpaperDay0"`
	D1Eligible       int64  `json:"d1Eligible"`
	D1Retained       int64  `json:"d1Retained"`
	D7Eligible       int64  `json:"d7Eligible"`
	D7Retained       int64  `json:"d7Retained"`
}

type SourceStats struct {
	Source  string `json:"source"`
	Method  string `json:"method"`
	Sets    int64  `json:"sets"`
	Devices int64  `json:"devices"`
}

// LauncherFunnel دستگاه‌های یکتا: پیشنهاد لانچر را دیدند → «امتحان می‌کنم»
// زدند → واقعاً لانچر پیش‌فرض شد.
type LauncherFunnel struct {
	Shown    int64 `json:"shown"`
	Accepted int64 `json:"accepted"`
	Enabled  int64 `json:"enabled"`
}

type SummaryResponse struct {
	Days       int            `json:"days"`
	Daily      []DailyStats   `json:"daily"`
	Versions   []CohortStats  `json:"versions"`
	Setters    CohortStats    `json:"setters"`
	NonSetters CohortStats    `json:"nonSetters"`
	Sources    []SourceStats  `json:"sources"`
	Launcher   LauncherFunnel `json:"launcher"`
}
