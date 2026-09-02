"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { ChefHat, ExternalLink, X } from "lucide-react";
import type { RecipeLink } from "@/lib/recipes";

// Client-safe shape of a recipe card — mirrors lib/recipes.ts's
// RecipeEntry but swaps the server-only localFilePath for the markdown
// content itself (already read server-side in app/recipes/page.tsx).
export interface RecipeCardData {
  id: string;
  slug: string;
  dish: string;
  category: string;
  cuisine: string;
  links: RecipeLink[];
  milo: string;
  arlo: string;
  additionalIngredients: string;
  markdown: string | null;
}

function imageUrl(recipe: RecipeCardData): string {
  return `/api/recipes/image?slug=${encodeURIComponent(recipe.slug)}`;
}

function LikeBadge({ label, rating }: { label: string; rating: string }) {
  if (!rating) return null;
  const tone =
    rating.toLowerCase() === "high"
      ? "bg-emerald-50 text-emerald-700"
      : rating.toLowerCase() === "medium"
        ? "bg-amber-50 text-amber-700"
        : "bg-slate-100 text-slate-600";
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${tone}`}>
      {label}: {rating}
    </span>
  );
}

function RecipeCard({ recipe, onOpen }: { recipe: RecipeCardData; onOpen: (id: string) => void }) {
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = !imageFailed;

  return (
    <button
      type="button"
      onClick={() => onOpen(recipe.id)}
      className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white text-left shadow-sm transition-shadow hover:shadow-md"
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl(recipe)}
          alt=""
          loading="lazy"
          className="h-36 w-full object-cover"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <div className="flex h-36 w-full items-center justify-center bg-slate-100 text-slate-300">
          <ChefHat className="h-8 w-8" />
        </div>
      )}
      <div className="flex flex-1 flex-col p-4">
        <p className="line-clamp-2 text-sm font-semibold text-slate-900">{recipe.dish}</p>
        <p className="mt-1 text-xs text-slate-400">
          {recipe.category}
          {recipe.cuisine ? ` · ${recipe.cuisine}` : ""}
        </p>
        {(recipe.milo || recipe.arlo) && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            <LikeBadge label="Milo" rating={recipe.milo} />
            <LikeBadge label="Arlo" rating={recipe.arlo} />
          </div>
        )}
      </div>
    </button>
  );
}

function RecipeModal({ recipe, onClose }: { recipe: RecipeCardData; onClose: () => void }) {
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = !imageFailed;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative">
          {showImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl(recipe)}
              alt=""
              className="max-h-80 w-full object-cover"
              onError={() => setImageFailed(true)}
            />
          ) : (
            <div className="flex h-40 w-full items-center justify-center bg-slate-100 text-slate-300">
              <ChefHat className="h-10 w-10" />
            </div>
          )}
          <button
            type="button"
            onClick={onClose}
            title="Close"
            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-slate-500 shadow hover:bg-white hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6">
          <h2 className="text-lg font-bold text-slate-900">{recipe.dish}</h2>
          <p className="mt-1 text-xs text-slate-400">
            {recipe.category}
            {recipe.cuisine ? ` · ${recipe.cuisine}` : ""}
          </p>

          {(recipe.milo || recipe.arlo) && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              <LikeBadge label="Milo" rating={recipe.milo} />
              <LikeBadge label="Arlo" rating={recipe.arlo} />
            </div>
          )}

          {recipe.additionalIngredients && (
            <p className="mt-3 text-sm text-slate-600">
              <span className="font-medium text-slate-700">Additional ingredients: </span>
              {recipe.additionalIngredients}
            </p>
          )}

          {recipe.links.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {recipe.links
                .filter((l) => /^https?:\/\//i.test(l.url))
                .map((l) => (
                  <a
                    key={l.url}
                    href={l.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                  >
                    <ExternalLink className="h-3 w-3" />
                    {l.label}
                  </a>
                ))}
            </div>
          )}

          {recipe.markdown ? (
            <div className="recipe-body prose-slate mt-5 max-w-none border-t border-slate-100 pt-5 text-sm text-slate-700 [&_h1]:mb-2 [&_h1]:text-base [&_h1]:font-bold [&_h1]:text-slate-900 [&_h2]:mb-2 [&_h2]:mt-5 [&_h2]:text-sm [&_h2]:font-bold [&_h2]:text-slate-900 [&_h2]:first:mt-0 [&_li]:mt-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5 [&_a]:text-blue-600 [&_a:hover]:underline [&_em]:text-slate-500 [&_strong]:font-semibold [&_strong]:text-slate-900 [&_p]:mt-2">
              <ReactMarkdown>{recipe.markdown}</ReactMarkdown>
            </div>
          ) : (
            <p className="recipe-body mt-5 border-t border-slate-100 pt-5 text-sm text-slate-500">
              No local recipe file saved for this dish yet — use the source link above.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export function RecipesBoard({ recipes }: { recipes: RecipeCardData[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const openRecipe = openId ? recipes.find((r) => r.id === openId) ?? null : null;

  if (recipes.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        No recipes found yet. Check that FOOD_PLANNING_DIR points at the folder with
        Food_list.md, and that some rows have a Recipe Link.
      </p>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {recipes.map((recipe) => (
          <RecipeCard key={recipe.id} recipe={recipe} onOpen={setOpenId} />
        ))}
      </div>

      {openRecipe && <RecipeModal recipe={openRecipe} onClose={() => setOpenId(null)} />}
    </div>
  );
}
