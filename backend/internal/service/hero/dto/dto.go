package dto

type HeroDTO struct {
	Title  string `json:"title"`
	Slogan string `json:"slogan"`
	Image  string `json:"image"`
}

type HeroResponse struct {
	Hero HeroDTO `json:"hero"`
}

type UpsertHeroRequest struct {
	Title  string `json:"title"`
	Slogan string `json:"slogan"`
	Image  string `json:"image"`
}
