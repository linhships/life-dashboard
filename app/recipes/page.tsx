import { getRecipeMarkdown, getRecipes } from "@/lib/recipes";
import { RecipesBoard, type RecipeCardData } from "@/components/RecipesBoard";
import { ChefHat } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function RecipesPage() {
  const recipes = getRecipes();
  const cards: RecipeCardData[] = recipes.map((r) => ({
    id: r.id,
    slug: r.slug,
    dish: r.dish,
    category: r.category,
    cuisine: r.cuisine,
    links: r.links,
    milo: r.milo,
    arlo: r.arlo,
    additionalIngredients: r.additionalIngredients,
    markdown: getRecipeMarkdown(r),
  }));

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-6 py-10">
      <header>
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <ChefHat className="h-4 w-4" />
          <span>{cards.length} recipes</span>
        </div>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">Recipes</h1>
        <p className="mt-2 text-sm text-slate-500">
          Every dish from the food list with a saved recipe — pulled from Food_list.md, with
          photos sourced from each recipe&apos;s original page.
        </p>
      </header>

      <RecipesBoard recipes={cards} />
    </main>
  );
}
