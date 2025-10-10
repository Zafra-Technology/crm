from django.contrib import admin
from django import forms
from .models import Project, ProjectAttachment, ProjectUpdate, Task


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    # Avoid rendering widgets that trigger Djongo relational queries
    exclude = ("designers",)
    # Provide a lightweight text field to manage designers by IDs
    class ProjectAdminForm(forms.ModelForm):
        designer_ids = forms.CharField(
            required=False,
            help_text="Comma-separated StaffUser IDs to assign as designers"
        )

        class Meta:
            model = Project
            fields = "__all__"

        def __init__(self, *args, **kwargs):
            super().__init__(*args, **kwargs)
            # Pre-fill with current designer IDs
            if self.instance and self.instance.pk:
                current_ids = list(
                    self.instance.designers.values_list("id", flat=True)
                )
                self.fields["designer_ids"].initial = ",".join(
                    str(pk) for pk in current_ids
                )

    form = ProjectAdminForm
    fields = (
        "name",
        "description",
        "requirements",
        "timeline",
        "status",
        "client",
        "manager",
        "designer_ids",
        "_assigned_designers",
        "created_at",
        "updated_at",
    )
    readonly_fields = ("client", "manager", "created_at", "updated_at", "_assigned_designers")
    list_display = ("name", "status", "client", "manager", "created_at")
    list_filter = ("status", "created_at")
    search_fields = ("name", "description")

    def save_model(self, request, obj, form, change):
        super().save_model(request, obj, form, change)
        # Update designers from designer_ids text field
        designer_ids_text = form.cleaned_data.get("designer_ids", "")
        if designer_ids_text is not None:
            try:
                cleaned_ids = [
                    int(pk.strip()) for pk in designer_ids_text.split(",") if pk.strip()
                ]
            except ValueError:
                cleaned_ids = []
            obj.designers.set(cleaned_ids)

    def _assigned_designers(self, obj):
        try:
            ids = list(obj.designers.values_list("id", flat=True))
            emails = list(obj.designers.values_list("email", flat=True))
            return f"IDs: {ids}\nEmails: {emails}"
        except Exception as e:
            return f"Error loading designers: {e}"
    _assigned_designers.short_description = "Assigned Designers"


admin.site.register(ProjectAttachment)
admin.site.register(ProjectUpdate)
admin.site.register(Task)