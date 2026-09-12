#pragma once

#include "CoreMinimal.h"
#include "Subsystems/GameInstanceSubsystem.h"
#include "Engine/DataTable.h"
#include "EmpireTypes.h"
#include "EmpireSimSubsystem.generated.h"

DECLARE_DYNAMIC_MULTICAST_DELEGATE(FOnEmpireSimTick);
DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnEmpireDialogue, FName, LineId);

/**
 * v0 loop: Defend Neon Row → Debrief Marcus → watch Control / Loyalty.
 * Fill the DataTable refs in the editor. Implementation can stay in Blueprint
 * (see Docs/BP_EmpireSim.md) or land in a .cpp later.
 */
UCLASS(BlueprintType)
class UEmpireSimSubsystem : public UGameInstanceSubsystem
{
	GENERATED_BODY()

public:
	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Empire")
	TObjectPtr<UDataTable> Crews;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Empire")
	TObjectPtr<UDataTable> Territories;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Empire")
	TObjectPtr<UDataTable> Quests;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Empire")
	TObjectPtr<UDataTable> Dialogue;

	UPROPERTY(BlueprintReadOnly, Category = "Empire")
	TMap<FName, float> Control;

	UPROPERTY(BlueprintReadOnly, Category = "Empire")
	TMap<FName, float> Heat;

	UPROPERTY(BlueprintReadOnly, Category = "Empire")
	TMap<FName, float> Loyalty;

	UPROPERTY(BlueprintReadOnly, Category = "Empire")
	TArray<FName> Assigned;

	UPROPERTY(BlueprintReadOnly, Category = "Empire")
	FName CurrentTactic;

	UPROPERTY(BlueprintReadOnly, Category = "Empire")
	bool bLastDefenseWon = false;

	UPROPERTY(BlueprintAssignable, Category = "Empire")
	FOnEmpireSimTick OnSimTick;

	UPROPERTY(BlueprintAssignable, Category = "Empire")
	FOnEmpireDialogue OnDialogue;

	UFUNCTION(BlueprintCallable, Category = "Empire")
	void HydrateFromTables();

	UFUNCTION(BlueprintCallable, Category = "Empire")
	void TickSim();

	UFUNCTION(BlueprintCallable, Category = "Empire")
	void ResolveDefense(FName TerritoryId, FName TacticId);

	UFUNCTION(BlueprintCallable, Category = "Empire")
	void ApplyDialogueChoice(FName LineId, int32 ChoiceIndex);
};
