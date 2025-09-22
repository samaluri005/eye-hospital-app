using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable
public partial class InitialCreate : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";");

        migrationBuilder.CreateTable(
            name: "patient",
            columns: table => new
            {
                patient_id = table.Column<Guid>(nullable: false, defaultValueSql: "uuid_generate_v4()"),
                email = table.Column<string>(nullable: true),
                phone = table.Column<string>(maxLength: 30, nullable: false),
                full_name = table.Column<string>(nullable: true),
                dob = table.Column<DateTime>(nullable: true),
                mrn_encrypted = table.Column<byte[]>(nullable: true),
                status = table.Column<string>(nullable: false, defaultValue: "active"),
                created_at = table.Column<DateTime>(nullable: false, defaultValueSql: "now()"),
                updated_at = table.Column<DateTime>(nullable: false, defaultValueSql: "now()")
            },
            constraints: table =>
            {
                table.PrimaryKey("pk_patient", x => x.patient_id);
            });

        migrationBuilder.CreateIndex(
            name: "idx_patient_phone",
            table: "patient",
            column: "phone",
            unique: true);

        migrationBuilder.CreateIndex(
            name: "idx_patient_email",
            table: "patient",
            column: "email",
            unique: true);

        migrationBuilder.CreateTable(
            name: "auth_identity",
            columns: table => new
            {
                id = table.Column<long>(nullable: false)
                    .Annotation("Npgsql:ValueGenerationStrategy", Npgsql.EntityFrameworkCore.PostgreSQL.Metadata.NpgsqlValueGenerationStrategy.SerialColumn),
                patient_id = table.Column<Guid>(nullable: true),
                provider = table.Column<string>(nullable: false),
                provider_subject = table.Column<string>(nullable: false),
                created_at = table.Column<DateTime>(nullable: false, defaultValueSql: "now()")
            },
            constraints: table =>
            {
                table.PrimaryKey("pk_auth_identity", x => x.id);
                table.ForeignKey("fk_auth_identity_patient", x => x.patient_id, "patient", "patient_id", onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateIndex(
            name: "idx_auth_identity_provider_subject",
            table: "auth_identity",
            columns: new[] { "provider", "provider_subject" },
            unique: true);

        migrationBuilder.CreateTable(
            name: "otp_attempt",
            columns: table => new
            {
                id = table.Column<long>(nullable: false)
                    .Annotation("Npgsql:ValueGenerationStrategy", Npgsql.EntityFrameworkCore.PostgreSQL.Metadata.NpgsqlValueGenerationStrategy.SerialColumn),
                phone = table.Column<string>(maxLength: 30, nullable: false),
                otp_hash = table.Column<string>(nullable: true),
                nonce = table.Column<string>(nullable: true),
                expires_at = table.Column<DateTime>(nullable: true),
                attempts = table.Column<int>(nullable: false, defaultValue: 0),
                resend_count = table.Column<int>(nullable: false, defaultValue: 0),
                status = table.Column<string>(nullable: false, defaultValue: "pending"),
                created_at = table.Column<DateTime>(nullable: false, defaultValueSql: "now()")
            },
            constraints: table =>
            {
                table.PrimaryKey("pk_otp_attempt", x => x.id);
            });

        migrationBuilder.CreateIndex(
            name: "idx_otp_phone",
            table: "otp_attempt",
            column: "phone");

        migrationBuilder.CreateTable(
            name: "consent",
            columns: table => new
            {
                id = table.Column<long>(nullable: false)
                    .Annotation("Npgsql:ValueGenerationStrategy", Npgsql.EntityFrameworkCore.PostgreSQL.Metadata.NpgsqlValueGenerationStrategy.SerialColumn),
                patient_id = table.Column<Guid>(nullable: true),
                consent_type = table.Column<string>(nullable: false),
                version = table.Column<string>(nullable: false),
                consent_text_hash = table.Column<string>(nullable: false),
                accepted = table.Column<bool>(nullable: false, defaultValue: false),
                accepted_at = table.Column<DateTime>(nullable: true),
                revoked_at = table.Column<DateTime>(nullable: true),
                accepted_ip = table.Column<string>(nullable: true),
                accepted_user_agent = table.Column<string>(nullable: true)
            },
            constraints: table =>
            {
                table.PrimaryKey("pk_consent", x => x.id);
                table.ForeignKey("fk_consent_patient", x => x.patient_id, "patient", "patient_id", onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateIndex(
            name: "idx_consent_patient",
            table: "consent",
            column: "patient_id");

        migrationBuilder.CreateTable(
            name: "device",
            columns: table => new
            {
                id = table.Column<long>(nullable: false)
                    .Annotation("Npgsql:ValueGenerationStrategy", Npgsql.EntityFrameworkCore.PostgreSQL.Metadata.NpgsqlValueGenerationStrategy.SerialColumn),
                patient_id = table.Column<Guid>(nullable: true),
                device_id = table.Column<string>(nullable: false),
                device_public_key = table.Column<string>(nullable: true),
                display_name = table.Column<string>(nullable: true),
                registered_at = table.Column<DateTime>(nullable: false, defaultValueSql: "now()"),
                last_used_at = table.Column<DateTime>(nullable: true),
                status = table.Column<string>(nullable: false, defaultValue: "active")
            },
            constraints: table =>
            {
                table.PrimaryKey("pk_device", x => x.id);
                table.ForeignKey("fk_device_patient", x => x.patient_id, "patient", "patient_id", onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateIndex(
            name: "idx_device_patient",
            table: "device",
            column: "patient_id");

        migrationBuilder.CreateTable(
            name: "audit_log",
            columns: table => new
            {
                id = table.Column<long>(nullable: false)
                    .Annotation("Npgsql:ValueGenerationStrategy", Npgsql.EntityFrameworkCore.PostgreSQL.Metadata.NpgsqlValueGenerationStrategy.SerialColumn),
                patient_id = table.Column<Guid>(nullable: true),
                actor = table.Column<string>(nullable: true),
                action = table.Column<string>(nullable: false),
                details = table.Column<string>(nullable: true),
                ip = table.Column<string>(nullable: true),
                user_agent = table.Column<string>(nullable: true),
                created_at = table.Column<DateTime>(nullable: false, defaultValueSql: "now()")
            },
            constraints: table =>
            {
                table.PrimaryKey("pk_audit_log", x => x.id);
            });

        migrationBuilder.CreateIndex(
            name: "idx_audit_patient_created",
            table: "audit_log",
            columns: new[] { "patient_id", "created_at" });
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable("audit_log");
        migrationBuilder.DropTable("device");
        migrationBuilder.DropTable("consent");
        migrationBuilder.DropTable("otp_attempt");
        migrationBuilder.DropTable("auth_identity");
        migrationBuilder.DropTable("patient");
    }
}