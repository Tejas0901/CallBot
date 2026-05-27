"use client";

import { useState } from "react";
import MainLayout from "@/components/layouts/MainLayout";
import TemplateSidebar from "@/components/templates/TemplateSidebar";
import TemplateEditor from "@/components/templates/TemplateEditor";
import CreateTemplateDialog from "@/components/templates/CreateTemplateDialog";
import DeleteConfirmationDialogs from "@/components/templates/DeleteConfirmationDialogs";
import EmptyState from "@/components/templates/EmptyState";
import { useTemplates } from "@/hooks/useTemplates";
import { useQuestions } from "@/hooks/useQuestions";
import { useLoading } from "@/context/loading-context";
import { Template, NewTemplateForm } from "@/types/template";

export default function TemplatesPage() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDeleteTemplateDialog, setShowDeleteTemplateDialog] =
    useState(false);
  const [showDeleteQuestionDialog, setShowDeleteQuestionDialog] =
    useState(false);
  const [showDeleteFollowUpDialog, setShowDeleteFollowUpDialog] =
    useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    questionId?: string;
    followUpId?: string;
  } | null>(null);

  const {
    templates,
    selectedTemplate,
    templateName,
    setSelectedTemplate,
    setTemplateName,
    createTemplate,
    deleteTemplate,
    updateTemplateName,
    addNewTemplate,
    removeTemplate,
    updateTemplateInList,
  } = useTemplates();

  const {
    questions,
    loadQuestionsFromTemplate,
    addQuestion,
    updateQuestion,
    deleteQuestion,
    addFollowUp,
    updateFollowUp,
    deleteFollowUp,
    clearQuestions,
  } = useQuestions();

  const { withLoading } = useLoading();

  const handleSelectTemplate = async (template: Template) => {
    setSelectedTemplate(template.id);
    setTemplateName(template.name);
    await withLoading(
      () => loadQuestionsFromTemplate(template.id),
      "Loading template"
    );
  };

  const handleCreateTemplate = async (form: NewTemplateForm) => {
    const templateId = `template_${Date.now()}`;
    const tagsArray = form.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

    const payload = {
      template_id: templateId,
      template_name: form.template_name,
      description: form.description,
      template_type: form.template_type,
      category: form.category,
      industry: form.industry,
      role_type: form.role_type,
      experience_level: form.experience_level || undefined,
      tags: tagsArray,
      difficulty_level: form.difficulty_level,
      language: form.language,
      estimated_duration_seconds: form.estimated_duration_seconds,
      script_json: {
        template_id: templateId,
        questions: [],
        intro: {},
        closing: {},
      },
      created_by: form.created_by,
      owner_id: form.owner_id,
    };

    const createdTemplate = await withLoading(
      () => createTemplate(payload),
      "Creating template"
    );
    if (!createdTemplate) return;

    const newTemplate: Template = {
      id: createdTemplate.template_id || templateId,
      name: form.template_name,
      questions: [],
    };

    addNewTemplate(newTemplate);
    setSelectedTemplate(newTemplate.id);
    setTemplateName(form.template_name);
    clearQuestions();
    setShowCreateDialog(false);

    // Load template details from backend
    await handleSelectTemplate(newTemplate);
  };

  const handleDeleteTemplate = async () => {
    if (!selectedTemplate) return;

    const success = await withLoading(
      () => deleteTemplate(selectedTemplate),
      "Deleting template"
    );
    if (!success) {
      setShowDeleteTemplateDialog(false);
      return;
    }

    const updatedTemplates = removeTemplate(selectedTemplate);

    if (updatedTemplates.length > 0) {
      setSelectedTemplate(updatedTemplates[0].id);
      setTemplateName(updatedTemplates[0].name);
      clearQuestions();
    } else {
      setSelectedTemplate(null);
      setTemplateName("");
      clearQuestions();
    }
    setShowDeleteTemplateDialog(false);
  };

  const handleSaveTemplate = async () => {
    if (!selectedTemplate) return;

    const success = await withLoading(
      () => updateTemplateName(selectedTemplate, templateName, questions),
      "Saving template"
    );
    if (success) {
      updateTemplateInList(selectedTemplate, templateName);
    }
  };

  const handleTemplateNameChange = (newName: string) => {
    setTemplateName(newName);
    if (selectedTemplate) {
      updateTemplateInList(selectedTemplate, newName);
    }
  };

  const confirmDeleteQuestion = (id: string) => {
    setDeleteTarget({ questionId: id });
    setShowDeleteQuestionDialog(true);
  };

  const handleDeleteQuestion = () => {
    if (deleteTarget?.questionId) {
      deleteQuestion(deleteTarget.questionId);
    }
    setShowDeleteQuestionDialog(false);
    setDeleteTarget(null);
  };

  const confirmDeleteFollowUp = (questionId: string, followUpId: string) => {
    setDeleteTarget({ questionId, followUpId });
    setShowDeleteFollowUpDialog(true);
  };

  const handleDeleteFollowUp = () => {
    if (deleteTarget?.questionId && deleteTarget?.followUpId) {
      deleteFollowUp(deleteTarget.questionId, deleteTarget.followUpId);
    }
    setShowDeleteFollowUpDialog(false);
    setDeleteTarget(null);
  };

  return (
    <MainLayout>
      <div className="flex h-[calc(100vh-4rem)]">
        <TemplateSidebar
          templates={templates}
          selectedTemplate={selectedTemplate}
          onSelectTemplate={handleSelectTemplate}
          onCreateTemplate={() => setShowCreateDialog(true)}
        />

        <div className="flex-1 overflow-y-auto bg-gray-50">
          {selectedTemplate ? (
            <TemplateEditor
              templateName={templateName}
              questions={questions}
              onTemplateNameChange={handleTemplateNameChange}
              onSaveTemplate={handleSaveTemplate}
              onDeleteTemplate={() => setShowDeleteTemplateDialog(true)}
              onAddQuestion={addQuestion}
              onUpdateQuestion={updateQuestion}
              onDeleteQuestion={confirmDeleteQuestion}
              onAddFollowUp={addFollowUp}
              onUpdateFollowUp={updateFollowUp}
              onDeleteFollowUp={confirmDeleteFollowUp}
            />
          ) : (
            <EmptyState onCreateTemplate={() => setShowCreateDialog(true)} />
          )}
        </div>
      </div>

      <CreateTemplateDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onCreateTemplate={handleCreateTemplate}
      />

      <DeleteConfirmationDialogs
        templateDialog={{
          open: showDeleteTemplateDialog,
          templateName: templateName,
          onConfirm: handleDeleteTemplate,
          onCancel: () => setShowDeleteTemplateDialog(false),
        }}
        questionDialog={{
          open: showDeleteQuestionDialog,
          onConfirm: handleDeleteQuestion,
          onCancel: () => {
            setShowDeleteQuestionDialog(false);
            setDeleteTarget(null);
          },
        }}
        followUpDialog={{
          open: showDeleteFollowUpDialog,
          onConfirm: handleDeleteFollowUp,
          onCancel: () => {
            setShowDeleteFollowUpDialog(false);
            setDeleteTarget(null);
          },
        }}
      />
    </MainLayout>
  );
}
