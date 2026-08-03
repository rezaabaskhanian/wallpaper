package migrator

import (
	"database/sql"
	"fmt"
	"log"
	"os"

	_ "github.com/jackc/pgx/v5/stdlib"

	"wallpaperstore/internal/repository/postgres"

	migrate "github.com/rubenv/sql-migrate"
)

type Migrator struct {
	dbconfig   postgres.Config
	migrations *migrate.FileMigrationSource
}

func New(dbConfig postgres.Config) Migrator {
	// مسیر مهاجرت‌ها از env قابل تنظیم است تا هم در اجرای محلی (go run از پوشه‌ی backend)
	// و هم داخل Docker (که migrations در ./migrations کپی می‌شود) کار کند.
	dir := os.Getenv("MIGRATIONS_DIR")
	if dir == "" {
		dir = "../internal/repository/postgres/migrations"
	}

	migrations := &migrate.FileMigrationSource{
		Dir: dir,
	}
	return Migrator{
		dbconfig:   dbConfig,
		migrations: migrations,
	}
}

func (m Migrator) Up() {
	db := m.open()
	n, err := migrate.Exec(db, "postgres", m.migrations, migrate.Up)
	if err != nil {
		log.Fatal("cant apply migrations:", err)
	}
	fmt.Printf("Applied %d migrations!\n", n)
}

func (m Migrator) Down() {
	db := m.open()
	n, err := migrate.Exec(db, "postgres", m.migrations, migrate.Down)
	if err != nil {
		log.Fatal("cant rollback migrations:", err)
	}
	fmt.Printf("Rolled back %d migrations!\n", n)
}

func (m Migrator) open() *sql.DB {
	connStr := fmt.Sprintf(
		"postgres://%s:%s@%s:%d/%s?sslmode=disable",
		m.dbconfig.UserName,
		m.dbconfig.Password,
		m.dbconfig.Host,
		m.dbconfig.Port,
		m.dbconfig.DBName,
	)

	db, err := sql.Open("pgx", connStr)
	if err != nil {
		log.Fatal("cant open pgx:", err)
	}
	return db
}
